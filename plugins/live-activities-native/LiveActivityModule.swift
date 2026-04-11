// LiveActivityModule.swift
// Native module to start/update/end Live Activities from React Native
// Requires iOS 16.1+ and ActivityKit

import Foundation

#if canImport(ActivityKit)
import ActivityKit
#endif

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
        if #available(iOS 16.1, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                resolve(false)
                return
            }

            // End any existing activities first
            endAllActivities()

            guard let contentState = parseContentState(from: data) else {
                reject("PARSE_ERROR", "Failed to parse Live Activity data", nil)
                return
            }

            let attributes = PrayerActivityAttributes()

            do {
                let content = ActivityContent(state: contentState, staleDate: Calendar.current.date(byAdding: .minute, value: 30, to: Date()))
                let _ = try Activity<PrayerActivityAttributes>.request(
                    attributes: attributes,
                    content: content,
                    pushType: nil
                )
                resolve(true)
            } catch {
                reject("START_ERROR", "Failed to start Live Activity: \(error.localizedDescription)", error)
            }
        } else {
            resolve(false)
        }
        #else
        resolve(false)
        #endif
    }

    // MARK: - Update Live Activity

    @objc func updatePrayerLiveActivity(
        _ data: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            guard let contentState = parseContentState(from: data) else {
                reject("PARSE_ERROR", "Failed to parse Live Activity data", nil)
                return
            }

            Task {
                let content = ActivityContent(state: contentState, staleDate: Calendar.current.date(byAdding: .minute, value: 30, to: Date()))
                for activity in Activity<PrayerActivityAttributes>.activities {
                    await activity.update(content)
                }
                resolve(true)
            }
        } else {
            resolve(false)
        }
        #else
        resolve(false)
        #endif
    }

    // MARK: - End Live Activity

    @objc func endPrayerLiveActivity(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            Task {
                endAllActivities()
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
        if #available(iOS 16.1, *) {
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
        if #available(iOS 16.1, *) {
            resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
        } else {
            resolve(false)
        }
        #else
        resolve(false)
        #endif
    }

    // MARK: - Helpers

    @available(iOS 16.1, *)
    private func endAllActivities() {
        #if canImport(ActivityKit)
        Task {
            for activity in Activity<PrayerActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
        #endif
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
