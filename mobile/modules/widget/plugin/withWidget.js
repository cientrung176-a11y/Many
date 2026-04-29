// withWidget.js — Expo Config Plugin for ThiNieuWidget
// Adds: App Group entitlement, UserDefaultsBridge native module,
//       and the WidgetKit extension target to the Xcode project.

const { withXcodeProject, withEntitlementsPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP    = 'group.com.lieu.ancuc.widget';
const WIDGET_NAME  = 'ThiNieuWidget';
const WIDGET_BID   = 'com.lieu.ancuc.widget';

// ─── 1. Add App Group to main app entitlements ───────────────────────────────
function withAppGroup(config) {
  return withEntitlementsPlist(config, (mod) => {
    const key = 'com.apple.security.application-groups';
    const groups = mod.modResults[key] || [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    mod.modResults[key] = groups;
    return mod;
  });
}

// ─── 2. Copy UserDefaultsBridge.m into main app Xcode target ────────────────
function withUserDefaultsBridge(config) {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const { platformProjectRoot, projectName } = mod.modRequest;

    const filename  = 'UserDefaultsBridge.m';
    const srcPath   = path.resolve(__dirname, '..', 'ios', filename);
    const destDir   = path.join(platformProjectRoot, projectName);
    const destPath  = path.join(destDir, filename);

    if (!fs.existsSync(srcPath)) return mod;

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(srcPath, destPath);

    // Check if already referenced in project
    const refs = project.hash.project.objects.PBXFileReference || {};
    const alreadyAdded = Object.values(refs).some(
      (f) => typeof f === 'object' && (f.path || '').endsWith(filename)
    );

    if (!alreadyAdded) {
      const mainTarget = project.getFirstTarget();
      const groupKey =
        project.findPBXGroupKey({ name: projectName }) ||
        project.getFirstProject().firstProject.mainGroup;

      project.addSourceFile(
        `${projectName}/${filename}`,
        { target: mainTarget.uuid },
        groupKey
      );
    }

    return mod;
  });
}

// ─── 3. Add Widget Extension target to Xcode project ────────────────────────
function withWidgetTarget(config) {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const { platformProjectRoot } = mod.modRequest;

    // Skip if already added
    const targets = project.hash.project.objects.PBXNativeTarget || {};
    if (Object.values(targets).some((t) => typeof t === 'object' && t.name === WIDGET_NAME)) {
      return mod;
    }

    // ── Create widget directory and files ──────────────────────────────────
    const widgetDir = path.join(platformProjectRoot, WIDGET_NAME);
    fs.mkdirSync(widgetDir, { recursive: true });

    const swiftSrc = path.resolve(__dirname, '..', 'ios', `${WIDGET_NAME}.swift`);
    if (fs.existsSync(swiftSrc)) {
      fs.copyFileSync(swiftSrc, path.join(widgetDir, `${WIDGET_NAME}.swift`));
    }

    fs.writeFileSync(path.join(widgetDir, 'Info.plist'),           WIDGET_INFO_PLIST);
    fs.writeFileSync(path.join(widgetDir, `${WIDGET_NAME}.entitlements`), getEntitlements());

    // ── Add Xcode target ───────────────────────────────────────────────────
    const widgetTarget = project.addTarget(
      WIDGET_NAME,
      'app_extension',
      WIDGET_NAME,
      WIDGET_BID
    );

    // ── Build phases ───────────────────────────────────────────────────────
    project.addBuildPhase(
      [`${WIDGET_NAME}/${WIDGET_NAME}.swift`],
      'PBXSourcesBuildPhase',
      'Sources',
      widgetTarget.uuid
    );
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', widgetTarget.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase',  'Resources',  widgetTarget.uuid);

    // ── Widget build settings ──────────────────────────────────────────────
    const configListUUID = widgetTarget.pbxNativeTarget.buildConfigurationList;
    const configList = project.hash.project.objects.XCConfigurationList[configListUUID];

    if (configList?.buildConfigurations) {
      for (const { value: uuid } of configList.buildConfigurations) {
        const cfg = project.hash.project.objects.XCBuildConfiguration[uuid];
        if (cfg && typeof cfg === 'object') {
          cfg.buildSettings = Object.assign({}, cfg.buildSettings, {
            APPLICATION_EXTENSION_API_ONLY: 'YES',
            CODE_SIGN_ENTITLEMENTS: `${WIDGET_NAME}/${WIDGET_NAME}.entitlements`,
            CODE_SIGN_STYLE: 'Automatic',
            INFOPLIST_FILE: `${WIDGET_NAME}/Info.plist`,
            IPHONEOS_DEPLOYMENT_TARGET: '14.0',
            MARKETING_VERSION: '1.0',
            PRODUCT_BUNDLE_IDENTIFIER: WIDGET_BID,
            PRODUCT_NAME: WIDGET_NAME,
            SKIP_INSTALL: 'YES',
            SWIFT_VERSION: '5.0',
            TARGETED_DEVICE_FAMILY: '"1,2"',
          });
        }
      }
    }

    // ── Embed widget in main app ───────────────────────────────────────────
    const mainTarget   = project.getFirstTarget();
    const productRef   = widgetTarget.pbxNativeTarget.productReference;

    // Generate UUID compatible with xcode package format
    const embedUUID = generateUUID();

    const buildFiles = project.hash.project.objects.PBXBuildFile || {};
    buildFiles[embedUUID] = {
      isa: 'PBXBuildFile',
      fileRef: productRef,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    buildFiles[`${embedUUID}_comment`] = `${WIDGET_NAME}.appex in Embed App Extensions`;
    project.hash.project.objects.PBXBuildFile = buildFiles;

    // Add or find "Embed App Extensions" CopyFiles phase on main target
    const copyPhaseUUID = generateUUID();
    const copyPhases = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
    copyPhases[copyPhaseUUID] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: 2147483647,
      dstPath: '""',
      dstSubfolderSpec: 13,
      files: [{ value: embedUUID, comment: `${WIDGET_NAME}.appex in Embed App Extensions` }],
      name: '"Embed App Extensions"',
      runOnlyForDeploymentPostprocessing: 0,
    };
    copyPhases[`${copyPhaseUUID}_comment`] = 'Embed App Extensions';
    project.hash.project.objects.PBXCopyFilesBuildPhase = copyPhases;

    // Append copy phase to main target's buildPhases array
    const mainNativeTarget = project.hash.project.objects.PBXNativeTarget[mainTarget.uuid];
    if (mainNativeTarget?.buildPhases) {
      mainNativeTarget.buildPhases.push({
        value: copyPhaseUUID,
        comment: 'Embed App Extensions',
      });
    }

    return mod;
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateUUID() {
  const hex = '0123456789ABCDEF';
  let id = '';
  for (let i = 0; i < 24; i++) id += hex[Math.floor(Math.random() * 16)];
  return id;
}

const WIDGET_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>com.apple.widgetkit-extension</string>
\t</dict>
</dict>
</plist>`;

function getEntitlements() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>${APP_GROUP}</string>
\t</array>
</dict>
</plist>`;
}

// ─── Export ───────────────────────────────────────────────────────────────────
module.exports = function withThiNieuWidget(config) {
  config = withAppGroup(config);
  config = withUserDefaultsBridge(config);
  config = withWidgetTarget(config);
  return config;
};
