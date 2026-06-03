// PrayerCalculator.swift
// Offline prayer-time computation inside the iOS widget extension.
//
// Reads PrayerInputs from the App Group and runs the vendored adhan-swift
// library (widgets/ios/Adhan/, Apache 2.0, batoulapps/adhan-swift 1.4.0) to
// produce prayer times for today + N days. The widget never needs the network
// or Background-App-Refresh — every TimelineProvider call recomputes locally
// from a small inputs JSON written by the main app.
//
// The vendored library types (PrayerTimes, Coordinates, CalculationMethod,
// Madhab, HighLatitudeRule, PrayerAdjustments) are compiled into the same
// widget extension target, so they appear at the top level without an
// `import Adhan` directive.

import Foundation

struct DayPrayerTimes {
    let date: Date
    let fajr: Date
    let sunrise: Date
    let dhuhr: Date
    let asr: Date
    let maghrib: Date
    let isha: Date

    subscript(key: PrayerKey) -> Date {
        switch key {
        case .fajr:    return fajr
        case .sunrise: return sunrise
        case .dhuhr:   return dhuhr
        case .asr:     return asr
        case .maghrib: return maghrib
        case .isha:    return isha
        }
    }
}

struct PrayerCalculatorState {
    let active: PrayerKey       // most recently-passed prayer (== previous)
    let previous: PrayerKey
    let next: PrayerKey
    let previousAt: Date
    let nextAt: Date
}

final class PrayerCalculator {
    let inputs: PrayerInputs
    private var dayCache: [String: DayPrayerTimes] = [:]

    init(inputs: PrayerInputs) {
        self.inputs = inputs
    }

    /// Convenience: load inputs from the App Group and return nil if missing.
    static func loadFromAppGroup() -> PrayerCalculator? {
        guard let inputs = PrayerInputs.read() else { return nil }
        return PrayerCalculator(inputs: inputs)
    }

    // MARK: - Core computation

    func times(for date: Date) -> DayPrayerTimes? {
        let key = isoDateKey(date)
        if let cached = dayCache[key] { return cached }

        let coords = Coordinates(latitude: inputs.latitude, longitude: inputs.longitude)
        let params = makeAdhanParams()
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = inputs.resolvedTimeZone
        let comps = cal.dateComponents([.year, .month, .day], from: date)
        guard let times = PrayerTimes(coordinates: coords,
                                      date: comps,
                                      calculationParameters: params) else {
            return nil
        }
        let result = DayPrayerTimes(
            date: date,
            fajr: normalizedForDisplay(times.fajr, calendarDay: comps),
            sunrise: normalizedForDisplay(times.sunrise, calendarDay: comps),
            dhuhr: normalizedForDisplay(times.dhuhr, calendarDay: comps),
            asr: normalizedForDisplay(times.asr, calendarDay: comps),
            maghrib: normalizedForDisplay(times.maghrib, calendarDay: comps),
            isha: normalizedForDisplay(times.isha, calendarDay: comps)
        )
        dayCache[key] = result
        return result
    }

    func timesForRange(starting date: Date, days: Int) -> [DayPrayerTimes] {
        var out: [DayPrayerTimes] = []
        out.reserveCapacity(days)
        let cal = Calendar(identifier: .gregorian)
        for i in 0 ..< days {
            guard let d = cal.date(byAdding: .day, value: i, to: date) else { continue }
            if let t = times(for: d) {
                out.append(t)
            }
        }
        return out
    }

    // MARK: - State resolution (active / next / previous)

    func state(at now: Date) -> PrayerCalculatorState? {
        let cal = Calendar(identifier: .gregorian)
        guard
            let yPrev = cal.date(byAdding: .day, value: -1, to: now),
            let yNext = cal.date(byAdding: .day, value: 1, to: now),
            let yesterday = times(for: yPrev),
            let today     = times(for: now),
            let tomorrow  = times(for: yNext)
        else { return nil }

        let order: [PrayerKey] = [.fajr, .sunrise, .dhuhr, .asr, .maghrib, .isha]
        var flat: [(key: PrayerKey, date: Date)] = []
        for day in [yesterday, today, tomorrow] {
            for k in order { flat.append((k, day[k])) }
        }
        guard !flat.isEmpty else { return nil }
        var previous = flat[0]
        var next = flat[flat.count - 1]
        for entry in flat {
            if entry.date <= now { previous = entry }
            else { next = entry; break }
        }
        return PrayerCalculatorState(
            active: previous.key,
            previous: previous.key,
            next: next.key,
            previousAt: previous.date,
            nextAt: next.date
        )
    }

    /// Sorted list of timeline-entry boundary dates spanning the next `days`
    /// days plus the entry at `now` itself. WidgetKit re-invokes the
    /// TimelineProvider at each boundary to recompute overlays.
    func timelineDates(from now: Date, days: Int) -> [Date] {
        var out: [Date] = [now]
        for day in timesForRange(starting: now, days: days) {
            out.append(contentsOf: [day.fajr, day.sunrise, day.dhuhr, day.asr, day.maghrib, day.isha])
        }
        return out.filter { $0 >= now }.sorted()
    }

    /// Flat list of every prayer epoch (ms since 1970) across `days`.
    /// Provided for SharedWidgetData parity with the JS bridge so existing
    /// SwiftUI prayer views that read `allPrayerEpochs` keep working.
    func allPrayerEpochsMs(from now: Date, days: Int) -> [Int64] {
        var startOfDay = Calendar(identifier: .gregorian)
        startOfDay.timeZone = inputs.resolvedTimeZone
        let start = startOfDay.startOfDay(for: now)
        var out: [Int64] = []
        for day in timesForRange(starting: start, days: days) {
            for k in [PrayerKey.fajr, .sunrise, .dhuhr, .asr, .maghrib, .isha] {
                out.append(Int64(day[k].timeIntervalSince1970 * 1000))
            }
        }
        return out.sorted()
    }

    // MARK: - adhan-swift adapter

    private func makeAdhanParams() -> CalculationParameters {
        var params: CalculationParameters
        switch inputs.calculationMethod {
        case .karachi:      params = CalculationMethod.karachi.params
        case .isna:         params = CalculationMethod.northAmerica.params
        case .mwl:          params = CalculationMethod.muslimWorldLeague.params
        case .ummAlQura:    params = CalculationMethod.ummAlQura.params
        case .egyptian:     params = CalculationMethod.egyptian.params
        case .tehran:       params = CalculationMethod.tehran.params
        case .gulf, .dubai: params = CalculationMethod.dubai.params
        case .kuwait:       params = CalculationMethod.kuwait.params
        case .qatar:        params = CalculationMethod.qatar.params
        case .singapore:    params = CalculationMethod.singapore.params
        case .turkey:       params = CalculationMethod.turkey.params
        case .moonsighting: params = CalculationMethod.moonsightingCommittee.params
        // Methods adhan-swift doesn't model natively — fall back to MWL.
        default:            params = CalculationMethod.muslimWorldLeague.params
        }
        params.madhab = inputs.madhab == .hanafi ? .hanafi : .shafi
        if let rule = inputs.highLatitudeRule {
            switch rule {
            case .middleOfTheNight:  params.highLatitudeRule = .middleOfTheNight
            case .seventhOfTheNight: params.highLatitudeRule = .seventhOfTheNight
            case .twilightAngle:     params.highLatitudeRule = .twilightAngle
            }
        }
        if let adj = inputs.adjustments {
            var a = params.adjustments
            a.fajr    += adj.fajr ?? 0
            a.sunrise += adj.sunrise ?? 0
            a.dhuhr   += adj.dhuhr ?? 0
            a.asr     += adj.asr ?? 0
            a.maghrib += adj.maghrib ?? 0
            a.isha    += adj.isha ?? 0
            params.adjustments = a
        }
        if let calibration = inputs.providerCalibration {
            var a = params.adjustments
            a.fajr    += calibration.fajr ?? 0
            a.sunrise += calibration.sunrise ?? 0
            a.dhuhr   += calibration.dhuhr ?? 0
            a.asr     += calibration.asr ?? 0
            a.maghrib += calibration.maghrib ?? 0
            a.isha    += calibration.isha ?? 0
            params.adjustments = a
        }
        return params
    }

    // MARK: - Helpers

    /// The app presents prayer rows beside the visible phone clock. Extract
    /// the solar wall-clock value at the calculation coordinates, then compose
    /// that same HH:mm on the phone's display day. This mirrors the JS widget
    /// calculator and prevents remote/stale coordinates from wrapping the
    /// table across midnight (for example Dhuhr before Fajr).
    private func normalizedForDisplay(_ rawDate: Date, calendarDay: DateComponents) -> Date {
        var calculationCalendar = Calendar(identifier: .gregorian)
        calculationCalendar.timeZone = inputs.resolvedCalculationTimeZone
        let clock = calculationCalendar.dateComponents([.hour, .minute], from: rawDate)

        var displayCalendar = Calendar(identifier: .gregorian)
        displayCalendar.timeZone = inputs.resolvedTimeZone
        var composed = calendarDay
        composed.hour = clock.hour
        composed.minute = clock.minute
        composed.second = 0
        return displayCalendar.date(from: composed) ?? rawDate
    }

    private func isoDateKey(_ date: Date) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = inputs.resolvedTimeZone
        let comps = cal.dateComponents([.year, .month, .day], from: date)
        return "\(comps.year ?? 0)-\(comps.month ?? 0)-\(comps.day ?? 0)"
    }
}
