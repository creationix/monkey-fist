// One level of a set, laid out like the web game's puzzle screen: the title and
// score above the board and the actions below it in portrait, or down the left
// and right sides on wide screens; pinch zoom and pan; and the result card.
import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:material_ui/material_ui.dart';
import 'package:flutter/scheduler.dart';

import '../core/engine.dart';
import '../game/game_state.dart';
import '../game/levels.dart';
import '../game/progress.dart';
import 'audio.dart';
import 'board_painter.dart';
import 'theme.dart';
import 'settings_screen.dart';

const Map<String, double> moveSpeeds = {'slow': .5, 'normal': 1, 'fast': 2};

/// The puzzle in progress. Levels keeps it while the player looks at the list,
/// so Continue returns to the same board, taps and undos.
class PlaySession {
  SetOpts opts = journeyOpts;
  int index = 0;
  GameState? game;
  bool get active => game != null && !game!.ended;
}

class GameScreen extends StatefulWidget {
  final SetOpts opts;
  final int index;
  final Progress progress;
  final LevelStore store;
  final SfxPlayer audio;
  final PlaySession session;
  const GameScreen({
    super.key,
    this.opts = journeyOpts,
    required this.index,
    required this.progress,
    required this.store,
    required this.audio,
    required this.session,
  });

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen>
    with SingleTickerProviderStateMixin {
  late int index = widget.index;
  late final SetOpts opts = widget.opts;
  late final String code = setCode(opts);
  GameState? game;
  bool failed = false;
  late final Ticker _ticker;
  Duration _last = Duration.zero;
  int _frame = 0;
  Size _size = Size.zero;
  EdgeInsets _bands = EdgeInsets.zero;
  double _lastScale = 1;
  bool _resultShown = false;
  bool _settingsOpen = false;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_tick)..start();
    widget.audio.warmUp();
    final session = widget.session;
    if (session.active && session.index == index && setCode(session.opts) == code) {
      _adopt(session.game!);
      _startMusic();
    } else {
      _load();
    }
  }

  @override
  void dispose() {
    widget.audio.music.pause();
    _ticker.dispose();
    super.dispose();
  }

  void _adopt(GameState g) {
    g.speedFactor = moveSpeeds[widget.progress.speed] ?? 1;
    g.graphics = widget.progress.graphics;
    g.onFinish = _finished;
    if (_size != Size.zero) _fit(g);
    game = g;
    widget.session
      ..opts = opts
      ..index = index
      ..game = g;
  }

  Future<void> _load() async {
    widget.audio.music.pause();
    setState(() {
      game = null;
      failed = false;
      _resultShown = false;
    });
    final want = index;
    final level = await widget.store.get(want, code);
    if (!mounted || want != index) return;
    if (level == null) {
      setState(() => failed = true);
      return;
    }
    setState(() => _adopt(GameState(level, sfx: widget.audio.play)));
    _startMusic();
    if (index + 1 < widget.progress.availableFor(opts)) {
      widget.store.prefetch(index + 1, code);
    }
  }

  void _fit(GameState g) {
    g.resize(
      _size.width,
      _size.height,
      top: _bands.top,
      bottom: _bands.bottom,
      left: _bands.left,
      right: _bands.right,
    );
  }

  void _tick(Duration elapsed) {
    final dt = math.min(.05, (elapsed - _last).inMicroseconds / 1e6);
    _last = elapsed;
    if (_settingsOpen) return;
    final g = game;
    if (g == null) return;
    final busy =
        g.moves.isNotEmpty ||
        g.hintTime > 0 ||
        g.bump >= 0 ||
        g.activations.isNotEmpty ||
        g.noticeTime > 0 ||
        g.fading ||
        g.cameraMoving ||
        (g.auto && !g.ended) ||
        (!g.ended && g.ropesLeft == 0);
    g.update(dt);
    if (busy) setState(() => _frame++);
  }

  void _finished(int stars) {
    widget.audio.music.pause();
    final g = game!;
    final opened = widget.progress.record(index, g.taps, stars, code: code);
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _showResult(stars, opened),
    );
  }

  Future<void> _showResult(int stars, int opened) async {
    if (!mounted || _resultShown) return;
    _resultShown = true;
    final g = game!;
    final p = widget.progress;
    final hasNext = index + 1 < p.availableFor(opts);
    final unlocked = opened > 0
        ? 'Levels ${(p.chapters - opened) * 10 + 1}–${p.chapters * 10} unlocked!'
        : (opts.journey && index == 119 ? 'Journey complete. Make a new tangle in Custom.' : '');
    final choice = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      barrierColor: p.highContrast
          ? const Color(0xcc000000)
          : const Color(0xbb04131d),
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 7, sigmaY: 7),
        child: _ResultCard(
          stars: stars,
          text: g.usedAuto
              ? 'Auto-solved · 0 stars'
              : '${g.taps} ${g.taps == 1 ? 'tap' : 'taps'} · par ${g.par}',
          unlocked: unlocked,
          hasNext: hasNext,
        ),
      ),
    );
    if (!mounted) return;
    switch (choice) {
      case 'next':
        index++;
        _load();
      case 'replay':
        _resultShown = false;
        setState(() => game!.restart());
        _startMusic();
      default:
        Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final g = game;
    final hc = widget.progress.highContrast;
    return Scaffold(
      body: DecoratedBox(
        decoration: appBackground(hc),
        child: LayoutBuilder(
          builder: (context, box) {
            final size = Size(box.maxWidth, box.maxHeight);
            final layout = _Layout(context, size, opts, index, g);
            if (size != _size || layout.bands != _bands) {
              _size = size;
              _bands = layout.bands;
              if (g != null) _fit(g);
            }
            // While auto-solve plays, the board is the whole screen (as on the web).
            final hud = g == null || !(g.usedAuto && !g.ended);
            return Stack(
              children: [
                if (g != null)
                  Positioned.fill(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTapUp: (d) {
                        widget.audio.music.activity();
                        setState(
                          () =>
                              g.pointer(d.localPosition.dx, d.localPosition.dy),
                        );
                      },
                      onScaleStart: (d) => _lastScale = 1,
                      onScaleUpdate: (d) => setState(() {
                        if (d.pointerCount >= 2) {
                          g.zoomAt(
                            d.scale / _lastScale,
                            d.localFocalPoint.dx,
                            d.localFocalPoint.dy,
                          );
                          _lastScale = d.scale;
                        }
                        g.panBy(d.focalPointDelta.dx, d.focalPointDelta.dy);
                      }),
                      child: CustomPaint(
                        painter: BoardPainter(
                          g,
                          _frame,
                          graphics: widget.progress.graphics,
                          oled: hc,
                        ),
                        size: size,
                      ),
                    ),
                  ),
                if (g == null) Center(child: _loading()),
                // A zoomed board passes under the title and score; keep them readable.
                Positioned(
                  left: 0,
                  right: 0,
                  top: 0,
                  height: mq.padding.top + 130,
                  child: IgnorePointer(
                    child: AnimatedOpacity(
                      opacity: g != null && g.zoom > 1 ? .9 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Theme.of(context).scaffoldBackgroundColor,
                              Theme.of(context).scaffoldBackgroundColor,
                              Theme.of(context).scaffoldBackgroundColor
                                  .withValues(alpha: 0),
                            ],
                            stops: const [0, .45, 1],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                if (hud) ...[
                  Positioned(
                    left: layout.headingLeft,
                    top: layout.top,
                    child: _heading(layout),
                  ),
                  Positioned(
                    right: layout.cornerRight,
                    top: layout.top,
                    child: SettingsButton(onPressed: _settings),
                  ),
                  if (g != null) _score(g, layout),
                  if (g != null) _toolbar(g, layout),
                ],
                if (g != null && g.notice.isNotEmpty)
                  Center(
                    child: IgnorePointer(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 22,
                          vertical: 11,
                        ),
                        decoration: BoxDecoration(
                          color: hc
                              ? const Color(0xffc1ccc8)
                              : const Color(0xffe9f5ee),
                          borderRadius: BorderRadius.circular(30),
                        ),
                        child: Text(
                          g.notice,
                          style: const TextStyle(
                            color: Color(0xff122c36),
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _loading() => failed
      ? Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'This tangle could not be woven.',
              style: TextStyle(color: kMuted),
            ),
            TextButton(onPressed: _load, child: const Text('Try again')),
          ],
        )
      : const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: kAccent),
            ),
            SizedBox(width: 14),
            Text('Weaving your tangle…', style: TextStyle(color: kMuted)),
          ],
        );

  Future<void> _settings() async {
    if (_settingsOpen) return;
    _settingsOpen = true;
    widget.audio.music.pause();
    try {
      await openSettings(context, widget.progress, widget.audio);
    } finally {
      _settingsOpen = false;
    }
    if (!mounted) return;
    setState(() {
      game
        ?..speedFactor = moveSpeeds[widget.progress.speed] ?? 1
        ..graphics = widget.progress.graphics;
    });
    if (game != null && !game!.ended) _startMusic();
  }

  Widget _heading(_Layout layout) {
    final hex = levelSpec(opts, index).hex;
    final muted = appMuted(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: 'Levels',
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        const SizedBox(width: 6),
        DefaultTextStyle.merge(
          style: TextStyle(shadows: _Layout.legible(context)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: 'Level ${index + 1}'),
                    TextSpan(
                      text: ' / ${opts.count}',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: muted,
                      ),
                    ),
                  ],
                ),
                style: layout.titleStyle,
              ),
              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GridIcon(hex: hex, size: 13),
                  const SizedBox(width: 5),
                  Text(
                    layout.subtitle,
                    style: TextStyle(fontSize: layout.small, color: muted),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _score(GameState g, _Layout layout) {
    final muted = TextStyle(
      fontSize: layout.small + 1,
      color: appMuted(context),
    );
    final taps = Text(
      '${g.taps} ${g.taps == 1 ? 'tap' : 'taps'}',
      style: muted.copyWith(color: kAccent, fontWeight: FontWeight.w600),
    );
    final par = Text('Par ${g.par}', style: muted);
    final left = Text(
      '${g.ropesLeft} ${g.ropesLeft == 1 ? 'rope' : 'ropes'} left',
      style: muted,
    );
    final style = TextStyle(shadows: _Layout.legible(context));
    if (layout.wide) {
      return Positioned(
        right: layout.scoreRight,
        top: layout.scoreTop,
        child: DefaultTextStyle.merge(
          style: style,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              taps,
              const SizedBox(height: 2),
              par,
              const SizedBox(height: 2),
              left,
            ],
          ),
        ),
      );
    }
    return Positioned(
      left: layout.scoreSide.left,
      right: layout.scoreSide.right,
      top: layout.scoreTop,
      child: DefaultTextStyle.merge(
        style: style,
        child: Row(
          children: [
            taps,
            const SizedBox(width: 12),
            par,
            const Spacer(),
            left,
          ],
        ),
      ),
    );
  }

  Widget _action(
    _Layout layout,
    IconData icon,
    String label,
    String? small,
    VoidCallback? onTap, {
    Color iconColor = kText,
  }) => Opacity(
    opacity: onTap == null ? (widget.progress.highContrast ? .55 : .35) : 1,
    child: SizedBox(
      width: layout.button.width,
      height: layout.button.height,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: layout.large ? 28 : 24, color: iconColor),
              const SizedBox(height: 3),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: label),
                    if (small != null)
                      TextSpan(
                        text: ' $small',
                        style: const TextStyle(color: kAccent),
                      ),
                  ],
                ),
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.fade,
                style: TextStyle(
                  fontSize: layout.large ? 12 : 11,
                  color: kText,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Widget _toolbar(GameState g, _Layout layout) {
    final buttons = [
      _action(
        layout,
        Icons.undo_rounded,
        'Undo',
        '${g.undos}',
        g.canUndo ? () => setState(g.undo) : null,
      ),
      _action(
        layout,
        Icons.lightbulb_outline_rounded,
        'Hint',
        '+2',
        g.canHint ? () => setState(g.showHint) : null,
        iconColor: kAccent,
      ),
      _action(
        layout,
        Icons.fast_forward_rounded,
        'Solve',
        '0★',
        g.canAutoSolve ? () => setState(g.autoSolve) : null,
      ),
      _action(
        layout,
        Icons.refresh_rounded,
        'Restart',
        null,
        g.ended ? null : () => setState(g.restart),
      ),
      // Fit is an action only while zoomed in.
      if (g.zoom > 1)
        _action(
          layout,
          Icons.fit_screen_rounded,
          'Fit',
          null,
          () => setState(g.fit),
        ),
    ];
    final scheme = Theme.of(context).colorScheme;
    final panel = BoxDecoration(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(layout.wide ? 20 : 22),
      border: Border.all(color: scheme.outlineVariant),
      boxShadow: const [
        BoxShadow(
          color: Color(0x44000000),
          blurRadius: 24,
          offset: Offset(0, 6),
        ),
      ],
    );
    if (layout.wide) {
      return Positioned(
        left: layout.toolbarSide,
        bottom: layout.toolbarBottom,
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: panel,
          child: SizedBox(
            width: layout.button.width * 2 + 2,
            child: Wrap(spacing: 2, runSpacing: 2, children: buttons),
          ),
        ),
      );
    }
    return Positioned(
      left: 12,
      right: 12,
      bottom: layout.toolbarBottom,
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          decoration: panel,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [for (final b in buttons) Flexible(child: b)],
          ),
        ),
      ),
    );
  }

  void _startMusic() {
    widget.audio.music.setSetting(widget.progress.music);
    widget.audio.music.startLevel(index + 1);
  }
}

/// Where the floating controls go, and the bands of the screen they cover.
/// Portrait puts them above and below the board; wide screens (wider than 6:5,
/// as on the web) put them down the left and right sides.
class _Layout {
  final bool wide, large;
  final double top,
      small,
      headingLeft,
      cornerRight,
      scoreTop,
      scoreRight,
      toolbarSide,
      toolbarBottom;
  final EdgeInsets scoreSide;
  final Size button;
  final TextStyle titleStyle;
  final String subtitle;
  late final EdgeInsets bands;

  static List<Shadow> legible(BuildContext context) {
    final page = Theme.of(context).scaffoldBackgroundColor;
    return [
      Shadow(color: page, blurRadius: 6, offset: const Offset(0, 1)),
      Shadow(color: page, blurRadius: 3),
    ];
  }

  factory _Layout(BuildContext context, Size size, SetOpts opts, int index, GameState? g) {
    final mq = MediaQuery.of(context);
    final scaler = mq.textScaler;
    final pad = mq.padding;
    final wide = size.width > size.height * 1.2;
    final large = size.width >= 900 && size.height >= 640;
    final small = large ? 13.0 : 12.0;
    final top = pad.top + (large ? 16 : 10);
    final titleStyle = TextStyle(
      fontSize: large ? 24 : 20,
      fontWeight: FontWeight.w700,
      height: 1.2,
    );
    final subtitle =
        '${levelSpec(opts, index).hex ? 'Hex' : 'Square'} · ${opts.journey ? 'Chapter ${index ~/ 10 + 1}' : 'Custom set'}';
    final button = Size(
      large ? 76 : 66,
      (large ? 68 : 60) + math.max(0, scaler.scale(11) - 11) * 1.5,
    );
    double width(String text, TextStyle style) {
      final painter = TextPainter(
        text: TextSpan(text: text, style: style),
        textScaler: scaler,
        textDirection: TextDirection.ltr,
      )..layout();
      final w = painter.width;
      painter.dispose();
      return w;
    }

    final layout = _Layout._(
      wide: wide,
      large: large,
      top: top,
      small: small,
      headingLeft: math.max(8, pad.left + 8),
      cornerRight: pad.right + (large ? 18 : 12),
      scoreTop: top + (large ? 64 : 58),
      scoreRight: pad.right + 16,
      scoreSide: EdgeInsets.only(left: pad.left + 24, right: pad.right + 24),
      toolbarSide: pad.left + (large ? 16 : 12),
      toolbarBottom: math.max(12, pad.bottom + 12),
      button: button,
      titleStyle: titleStyle,
      subtitle: subtitle,
    );
    final scoreHeight = scaler.scale(small + 1) * 1.4;
    if (wide) {
      final heading =
          48 +
          6 +
          math.max(
            width('Level ${index + 1}', titleStyle) +
                width(' / ${opts.count}', const TextStyle(fontSize: 13)),
            18 + width(subtitle, TextStyle(fontSize: small)),
          );
      final scoreWidth = g == null
          ? 0.0
          : ['${g.taps} taps', 'Par ${g.par}', '${g.ropesLeft} ropes left']
                .map(
                  (t) => width(
                    t,
                    TextStyle(fontSize: small + 1, fontWeight: FontWeight.w600),
                  ),
                )
                .reduce(math.max);
      layout.bands = EdgeInsets.fromLTRB(
        math.max(
              layout.headingLeft + heading,
              layout.toolbarSide + button.width * 2 + 14,
            ) +
            8,
        14,
        layout.scoreRight + math.max(48, scoreWidth) + 8,
        14,
      );
    } else {
      layout.bands = EdgeInsets.fromLTRB(
        12 + pad.left,
        layout.scoreTop + scoreHeight + 8,
        12 + pad.right,
        layout.toolbarBottom + button.height + 12 + 8,
      );
    }
    return layout;
  }

  _Layout._({
    required this.wide,
    required this.large,
    required this.top,
    required this.small,
    required this.headingLeft,
    required this.cornerRight,
    required this.scoreTop,
    required this.scoreRight,
    required this.scoreSide,
    required this.toolbarSide,
    required this.toolbarBottom,
    required this.button,
    required this.titleStyle,
    required this.subtitle,
  });
}

/// The web game's result card: an eyebrow, the title, stars, the score, and
/// full-width actions in order of importance.
class _ResultCard extends StatelessWidget {
  final int stars;
  final String text, unlocked;
  final bool hasNext;
  const _ResultCard({
    required this.stars,
    required this.text,
    required this.unlocked,
    required this.hasNext,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final wide = Size(double.infinity, 48);
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
    );
    return Dialog(
      insetPadding: const EdgeInsets.all(12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(26),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 370),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(26, 38, 26, 26),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'KNOT CLEARED',
                style: TextStyle(
                  color: kAccent,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                stars == 0 ? 'Solved' : 'Untangled!',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.5,
                ),
              ),
              const SizedBox(height: 14),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '★' * stars,
                      style: const TextStyle(color: kAccent),
                    ),
                    TextSpan(
                      text: '★' * (3 - stars),
                      style: TextStyle(color: kAccent.withValues(alpha: .2)),
                    ),
                  ],
                ),
                semanticsLabel: '$stars out of 3 stars',
                style: const TextStyle(fontSize: 38, letterSpacing: 7),
              ),
              const SizedBox(height: 6),
              Text(
                text,
                style: TextStyle(color: appMuted(context), fontSize: 15),
              ),
              if (unlocked.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  unlocked,
                  style: const TextStyle(
                    color: kAccent,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              if (hasNext) ...[
                FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: wide,
                    shape: shape,
                    textStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  onPressed: () => Navigator.pop(context, 'next'),
                  child: const Text('Next level →'),
                ),
                const SizedBox(height: 12),
              ],
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  minimumSize: wide,
                  shape: shape,
                  foregroundColor: kText,
                  backgroundColor: scheme.surfaceContainerHighest,
                  side: BorderSide(color: scheme.outlineVariant),
                  textStyle: const TextStyle(fontSize: 16),
                ),
                onPressed: () => Navigator.pop(context, 'replay'),
                child: const Text('Play again'),
              ),
              const SizedBox(height: 12),
              TextButton(
                style: TextButton.styleFrom(
                  minimumSize: wide,
                  foregroundColor: appMuted(context),
                  textStyle: const TextStyle(fontSize: 16),
                ),
                onPressed: () => Navigator.pop(context, 'levels'),
                child: const Text('Levels'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
