# Touch input and platform limits

The game should tolerate imprecise fingers and a hand resting on a tablet.
Browser gesture suppression protects gameplay, but cannot lock someone into an
ordinary installed web app. Native hosts expose more controls; the language
itself does not grant permission to suppress operating-system gestures.

## Current implementation

- Track each pointer independently. Do not require `isPrimary`, and do not let
  a resting contact absorb another finger's tap. Capture each active pointer;
  cancel just that contact on cancellation or lost capture. Reset all contacts
  on backgrounding, navigation, resizing, opening the menu, and starting a level.
- Latch the nearest rope at touch-down. Allow 42 CSS pixels of finger drift,
  with extra tolerance when release remains on that rope. Touch picking gets
  a minimum 22-pixel radius. Mouse input retains a tighter threshold.
- Do not reject touches by reported width or height: desktop touchscreen drivers
  can report large contact areas for ordinary fingers. Use timing and movement
  to keep resting contacts out of gestures. Held edge contacts never become pans
  or pinches; long-held contacts do not release ropes. Honor OS cancellation, but
  do not attempt a size-based palm classifier or recover touches never delivered.
- Pinching requires two fresh, moving contacts; a stationary third finger does
  not join or reset it. Pan/pinch recognition starts from the current camera to
  avoid a jump. A completed pinch cannot accidentally release a rope.
- Small boards with fit-scale cells at least 56 CSS pixels disable zoom/pan.
  Larger boards allow zoom, but pan only on overflowing axes. Camera limits
  shrink continuously to zero as the board fits. Fit and zoom buttons ease over
  220 ms, or apply instantly with reduced motion.
- Use `touch-action: none` on the game, non-passive consumed touch events on the
  canvas, and Safari gesture-event cancellation during gameplay. Cancelable
  events used by the game call `preventDefault()` and `stopPropagation()`.
- Disable selection, dragging, touch callouts, and context menus on the game.
  Limit hover effects to hover-capable devices. Menus retain scrolling and
  editable fields retain text selection. Do not disable page zoom with
  `user-scalable=no`.
- Disable document overscroll and request installed fullscreen with standalone
  fallback. Support varies; fullscreen is presentation, not a kiosk lock.

Relevant browser documentation: [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action),
[Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events),
[overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior),
and [manifest display overrides](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display_override).
Pointer capture routes delivered events to the canvas; it does not capture OS
Home, app-switching, Control Center, or notification gestures.

## Native iOS / iPadOS (Swift and UIKit)

A native view controller can request
[`preferredScreenEdgesDeferringSystemGestures`](https://developer.apple.com/documentation/uikit/uiviewcontroller/preferredscreenedgesdeferringsystemgestures)
so its gestures take precedence at selected edges. This is deferral, not a
permanent system-gesture lock. Call
`setNeedsUpdateOfScreenEdgesDeferringSystemGestures()` when the preference changes.
[`prefersHomeIndicatorAutoHidden`](https://developer.apple.com/documentation/uikit/uiviewcontroller/prefershomeindicatorautohidden)
requests hiding the visual indicator; it does not disable the Home action.

A custom native touch view can enable
[`isMultipleTouchEnabled`](https://developer.apple.com/documentation/uikit/uiview/ismultipletouchenabled),
track individual `UITouch` objects, inspect contact size, and handle canceled
touches. These APIs give more control over app input, not every iPad multitasking
gesture. Parent-enabled Guided Access remains the practical consumer option
for preventing accidental exits. The programmatic
[`requestGuidedAccessSession`](https://developer.apple.com/documentation/uikit/uiaccessibility/requestguidedaccesssession(enabled:completionhandler:))
API requires a supervised device and an app enabled by mobile-device management;
it is not a general way to switch on Guided Access on a family's tablet.

## Native Android (Kotlin)

Use [immersive mode](https://developer.android.com/develop/ui/views/layout/immersive)
through `WindowInsetsControllerCompat` to hide system bars and let swipes reveal
them temporarily. On Android 10+, use selective
[`setSystemGestureExclusionRects`](https://developer.android.com/develop/ui/views/touch-and-input/gestures/gesturenav)
for necessary Back-gesture conflict areas. These exclusions cannot opt out of
the bottom Home and quick-switch gestures. Respect mandatory system gesture
insets and keep important targets away from those areas.

Native touch handlers can inspect per-pointer data and cancellation flags.
Android 13+ documents `FLAG_CANCELED` on `ACTION_CANCEL` and `ACTION_POINTER_UP`
for [palm rejection](https://developer.android.com/develop/adaptive-apps/cookbook/stylus-palm-rejection).
Availability and classification still depend on device input behavior.

Screen pinning is the consumer option and remains user-exitable. Stronger
[lock task mode](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode)
requires device-policy-controller allowlisting on managed devices. Ordinary
apps cannot permanently hide all system navigation.

## Follow-up experiments after the current web version

Reminder for the next development milestone: when this web version is considered
done, revisit these experiments with the user, in this order:

1. Try a separate web app using WebAssembly, possibly written in MoonBit.
   MoonBit is a candidate, not a decided toolchain. Compare performance on the
   same devices and representative levels; WASM still uses browser gesture APIs.
2. Then try native iOS and Android apps to measure whether they perform better
   or offer better gesture control. Neither improvement is assumed in advance.

For the native experiment, a small Swift `WKWebView` host and Kotlin Android
WebView host around the existing game can provide an initial gesture comparison.
They can expose native controller/window gesture preferences while retaining
the shared generators, rendering, and audio. Test lifecycle, audio activation,
safe areas, and touch cancellation in each host. A wrapper does not inherently
make Canvas rendering faster. Rewriting the game in SpriteKit/Metal or Android
native rendering is a separate decision, unnecessary merely to access host APIs.

## Validation and remaining device checks

Automated tests cover jitter, independent taps, a held edge, broad contacts,
intentional pinch with a third contact, cancellation, camera limits, smooth Fit,
consumed browser events, and editable menus. Chromium CDP multi-touch tests
exercise the browser's PointerEvent/TouchEvent dispatch in addition to pure
recognizer tests. Exit-sound tests verify both grids clear the board and viewport
before completing, without waiting for the extended invisible route.

These tests do not establish physical iOS or Android OS-gesture behavior. Test
installed apps on both platforms with a resting hand, quick overlapping taps,
long presses, edge swipes, app switching, rotation, and return from background.
Check menus still scroll and keyboard users still see focus indicators.
