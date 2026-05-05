// LiveActivityModule.swift
// Native module to start/update/end Live Activities from React Native
// Requires iOS 16.1+ and ActivityKit

import Foundation
import os.log

#if canImport(ActivityKit)
import ActivityKit
#endif

private let laLog = OSLog(subsystem: "com.rooh.almuslim", category: "LiveActivity")

@objc(LiveActivityModule)
class LiveActivityModule: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    // MARK: - Start Live Activity

    @objc func startPrayerLiveActivity(
        _ data: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                os_log(.info, log: laLog, "areActivitiesEnabled = false (user disabled in Settings)")
                reject("DISABLED", "Live Activities are disabled in iOS Settings", nil)
                return
            }

            guard let contentState = parseContentState(from: data) else {
                os_log(.error, log: laLog, "parseContentState returned nil — missing required fields")
                reject("PARSE_ERROR", "Failed to parse Live Activity data — missing required fields (nextPrayerName, nextPrayerNameAr, nextPrayerTime, timeRemainingMinutes, hijriDate, style)", nil)
                return
            }

            // Compute stale date: prefer next-prayer time + 5 min, fallback to +30 min
            let staleDate = self.computeStaleDate(from: data)

            // End existing first, then request — sequenced inside one Task to avoid race
            Task {
                await self.endAllActivitiesAsync()
                do {
                    let content: ActivityContent<PrayerActivityAttributes.ContentState>
                    if #available(iOS 16.2, *) {
                        content = ActivityContent(state: contentState, staleDate: staleDate, relevanceScore: 100)
                    } else {
                        content = ActivityContent(state: contentState, staleDate: staleDate)
                    }
                    let attributes = PrayerActivityAttributes()
                    let activity = try Activity<PrayerActivityAttributes>.request(
                        attributes: attributes,
                        content: content,
                        pushType: nil
                    )
                    os_log(.info, log: laLog, "Live Activity started successfully (id=%{public}@)", activity.id)
                    resolve(true)
                } catch {
                    let nsErr = error as NSError
                    os_log(.error, log: laLog, "Activity.request failed: %{public}@ (domain=%{public}@ code=%{public}d)",
                           error.localizedDescription, nsErr.domain, nsErr.code)
                    reject("START_ERROR", "Failed to start Live Activity: \(error.localizedDescription) (domain=\(nsErr.domain) code=\(nsErr.code))", error)
                }
            }
        } else {
            reject("UNSUPPORTED", "iOS 16.2+ required for Live Activities", nil)
        }
        #else
        reject("UNSUPPORTED", "ActivityKit framework not available", nil)
        #endif
    }

    // MARK: - Update Live Activity

    @objc func updatePrayerLiveActivity(
        _ data: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            guard let contentState = parseContentState(from: data) else {
                reject("PARSE_ERROR", "Failed to parse Live Activity data", nil)
                return
            }

            let staleDate = self.computeStaleDate(from: data)

            Task {
                let content: ActivityContent<PrayerActivityAttributes.ContentState>
                if #available(iOS 16.2, *) {
                    content = ActivityContent(state: contentState, staleDate: staleDate, relevanceScore: 100)
                } else {
                    content = ActivityContent(state: contentState, staleDate: staleDate)
                }
                let activities = Activity<PrayerActivityAttributes>.activities
                if activities.isEmpty {
                    // No active activity to update — caller should fall back to start
                    os_log(.info, log: laLog, "updatePrayerLiveActivity: no active activities, returning false so JS calls start")
                    resolve(false)
                    return
                }
                for activity in activities {
                    await activity.update(content)
                }
                resolve(true)
            }
        } else {
            reject("UNSUPPORTED", "iOS 16.2+ required for Live Activities", nil)
        }
        #else
        reject("UNSUPPORTED", "ActivityKit framework not available", nil)
        #endif
    }

    // MARK: - End Live Activity

    @objc func endPrayerLiveActivity(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            Task {
                await self.endAllActivitiesAsync()
                resolve(true)
            }
        } else {
            resolve(false)
        }
        #else
        resolve(false)
        #endif
    }

    // MARK: - Check if Active

    @objc func isActivityActive(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            let hasActive = !Activity<PrayerActivityAttributes>.activities.isEmpty
            resolve(hasActive)
        } else {
            resolve(false)
        }
        #else
        resolve(false)
        #endif
    }

    // MARK: - Check if Activities Enabled

    @objc func areActivitiesEnabled(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
        } else {
            resolve(false)
        }
        #else
        resolve(false)
        #endif
    }

    // MARK: - Helpers

    @available(iOS 16.2, *)
    private func endAllActivitiesAsync() async {
        #if canImport(ActivityKit)
        for activity in Activity<PrayerActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        #endif
    }

    private func computeStaleDate(from data: NSDictionary) -> Date {
        // Use timeRemainingMinutes + 5 min buffer when available; clamp to >= 5 min
        if let mins = data["timeRemainingMinutes"] as? Int, mins > 0 {
            let total = max(mins + 5, 5)
            return Calendar.current.date(byAdding: .minute, value: total, to: Date()) ?? Date().addingTimeInterval(1800)
        }
        return Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    }

    private func parseContentState(from data: NSDictionary) -> PrayerActivityAttributes.ContentState? {
        guard let nextPrayerName = data["nextPrayerName"] as? String,
              let nextPrayerNameAr = data["nextPrayerNameAr"] as? String,
              let nextPrayerTime = data["nextPrayerTime"] as? String,
              let timeRemainingMinutes = data["timeRemainingMinutes"] as? Int,
              let hijriDate = data["hijriDate"] as? String,
              let style = data["style"] as? String else {
            return nil
        }

        var prayerItems: [PrayerActivityAttributes.PrayerItem] = []
        if let allPrayers = data["allPrayers"] as? [[String: Any]] {
            for prayer in allPrayers {
                guard let name = prayer["name"] as? String,
                      let nameAr = prayer["nameAr"] as? String,
                      let time = prayer["time"] as? String,
                      let passed = prayer["passed"] as? Bool else { continue }
                prayerItems.append(PrayerActivityAttributes.PrayerItem(
                    name: name, nameAr: nameAr, time: time, passed: passed
                ))
            }
        }

        return PrayerActivityAttributes.ContentState(
            nextPrayerName: nextPrayerName,
            nextPrayerNameAr: nextPrayerNameAr,
            nextPrayerTime: nextPrayerTime,
            timeRemainingMinutes: timeRemainingMinutes,
            nextPrayerDate: Date(timeIntervalSinceNow: TimeInterval(max(0, timeRemainingMinutes) * 60)),
            hijriDate: hijriDate,
            allPrayers: prayerItems,
            style: style,
            duaText: data["duaText"] as? String,
            ayahText: data["ayahText"] as? String,
            ayahRef: data["ayahRef"] as? String,
            sunriseTime: data["sunriseTime"] as? String
        )
    }
}
