// ThiNieuWidget.swift — iOS WidgetKit Extension
// TODO (Kimi): Complete widget implementation
//
// Steps to finish:
// 1. Add WidgetKit target in Xcode: File > New > Target > Widget Extension
// 2. Name it "ThiNieuWidget"
// 3. Copy this file into the target
// 4. Create Expo config plugin (see widget-plugin.js) to automate this
// 5. Run: eas build --platform ios --profile preview

import WidgetKit
import SwiftUI

// MARK: - Data model shared via App Group
struct ExpenseSummary: Codable {
    var total: Double
    var count: Int
    var monthName: String
    var updatedAt: String
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    let appGroupID = "group.com.lieu.ancuc.widget"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: .now, total: 1_500_000, count: 12, monthName: "Tháng 4")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let entry = loadEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadEntry() -> SimpleEntry {
        let defaults = UserDefaults(suiteName: appGroupID)
        let total = defaults?.double(forKey: "totalThisMonth") ?? 0
        let count = defaults?.integer(forKey: "countThisMonth") ?? 0
        let month = defaults?.string(forKey: "monthName") ?? "Tháng này"
        return SimpleEntry(date: .now, total: total, count: count, monthName: month)
    }
}

struct SimpleEntry: TimelineEntry {
    var date: Date
    var total: Double
    var count: Int
    var monthName: String
}

// MARK: - Widget View
struct ThiNieuWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("💰")
                Text("Thị Niễu")
                    .font(.caption).fontWeight(.bold)
                    .foregroundColor(.green)
            }
            Spacer()
            Text(formatVND(entry.total))
                .font(.title2).fontWeight(.black)
                .foregroundColor(.primary)
            Text("\(entry.count) khoản · \(entry.monthName)")
                .font(.caption2).foregroundColor(.secondary)
            Spacer()
            Link(destination: URL(string: "lieu-an-cuc://add-expense")!) {
                Label("Thêm chi tiêu", systemImage: "plus.circle.fill")
                    .font(.caption).fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Color.green)
                    .cornerRadius(8)
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
    }

    func formatVND(_ n: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.groupingSeparator = "."
        return (f.string(from: NSNumber(value: n)) ?? "0") + "₫"
    }
}

// MARK: - Widget Declaration
@main
struct ThiNieuWidget: Widget {
    let kind = "ThiNieuWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ThiNieuWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Thị Niễu")
        .description("Theo dõi chi tiêu và thêm nhanh từ màn hình chính")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
