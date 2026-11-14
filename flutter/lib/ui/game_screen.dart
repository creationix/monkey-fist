// One Journey level: the board, HUD, actions (undo, hint, auto-solve, restart,
// fit), pinch zoom and pan on large boards, and the result card.
import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';
import 'package:flutter/scheduler.dart';

import '../core/engine.dart';
import '../game/game_state.dart';
import '../game/levels.dart';
import '../game/progress.dart';
import 'audio.dart';
import 'board_painter.dart';
import 'theme.dart';

const Map<String, double> moveSpeeds = {'slow': .5, 'normal': 1, 'fast': 2};

class GameScreen extends StatefulWidget {
  final int index;
  final Progress progress;
  final LevelStore store;
  final SfxPlayer audio;
  const GameScreen({super.key, required this.index, required this.progress, required this.store, required this.audio});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with SingleTickerProviderStateMixin {
  late int index = widget.index;
  GameState? game;
  bool failed = false;
  late final Ticker _ticker;
  Duration _last = Duration.zero;
  int _frame = 0;
  Size _size = Size.zero;
  EdgeInsets _bands = EdgeInsets.zero;
  double _lastScale = 1;
  bool _resultShown = false;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_tick)..start();
    widget.audio.warmUp();
    _load();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      game = null;
      failed = false;
      _resultShown = false;
    });
    final want = index;
    final level = await widget.store.get(want);
    if (!mounted || want != index) return;
    if (level == null) {
      setState(() => failed = true);
      return;
    }
    final g = GameState(level, sfx: widget.audio.play);
    g.speedFactor = moveSpeeds[widget.progress.speed] ?? 1;
    g.onFinish = _finished;
    if (_size != Size.zero) _fit(g);
    setState(() => game = g);
    if (index + 1 < widget.progress.available) widget.store.prefetch(index + 1);
  }

  void _fit(GameState g) {
    g.resize(_size.width, _size.height, top: _bands.top, bottom: _bands.bottom, left: _bands.left, right: _bands.right);
  }

  void _tick(Duration elapsed) {
    final dt = math.min(.05, (elapsed - _last).inMicroseconds / 1e6);
    _last = elapsed;
    final g = game;
    if (g == null) return;
    final busy = g.moves.isNotEmpty ||
        g.hintTime > 0 ||
        g.bump >= 0 ||
        g.activations.isNotEmpty ||
        g.noticeTime > 0 ||
        (g.auto && !g.ended) ||
        (!g.ended && g.ropesLeft == 0);
    g.update(dt);
    if (busy) setState(() => _frame++);
  }

  void _finished(int stars) {
    final g = game!;
    final opened = widget.progress.record(index, g.taps, stars);
    WidgetsBinding.instance.addPostFrameCallback((_) => _showResult(stars, opened));
  }

  Future<void> _showResult(int stars, int opened) async {
    if (!mounted || _resultShown) return;
    _resultShown = true;
    final g = game!;
    final p = widget.progress;
    final hasNext = index + 1 < p.available;
    final unlocked = opened > 0
        ? 'Levels ${(p.chapters - opened) * 10 + 1}–${p.chapters * 10} unlocked!'
        : (index == 119 ? 'Journey complete.' : '');
    final choice = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        contentPadding: const EdgeInsets.fromLTRB(26, 30, 26, 10),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(stars == 0 ? 'Solved' : 'Untangled!', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Text.rich(TextSpan(children: [
              TextSpan(text: '★' * stars, style: const TextStyle(color: kAccent)),
              TextSpan(text: '★' * (3 - stars), style: TextStyle(color: kAccent.withValues(alpha: .2))),
            ]), style: const TextStyle(fontSize: 38, letterSpacing: 7)),
            const SizedBox(height: 8),
            Text(g.usedAuto ? 'Auto-solved · 0 stars' : '${g.taps} ${g.taps == 1 ? 'tap' : 'taps'} · par ${g.par}',
                style: const TextStyle(color: kMuted, fontSize: 15)),
            if (unlocked.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(unlocked, style: const TextStyle(color: kAccent, fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 20),
            if (hasNext)
              SizedBox(
                width: double.infinity,
                child: FilledButton(onPressed: () => Navigator.pop(context, 'next'), child: const Text('Next level')),
              ),
            SizedBox(
              width: double.infinity,
              child: TextButton(onPressed: () => Navigator.pop(context, 'replay'), child: const Text('Play again')),
            ),
            SizedBox(
              width: double.infinity,
              child: TextButton(onPressed: () => Navigator.pop(context, 'levels'), child: const Text('Levels')),
            ),
          ],
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
      default:
        Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final g = game;
    return Scaffold(
      body: DecoratedBox(
        decoration: backgroundGradient,
        child: LayoutBuilder(builder: (context, box) {
          final size = Size(box.maxWidth, box.maxHeight);
          final bands = EdgeInsets.fromLTRB(
              12 + mq.padding.left, mq.padding.top + 76, 12 + mq.padding.right, mq.padding.bottom + 86);
          if (size != _size || bands != _bands) {
            _size = size;
            _bands = bands;
            if (g != null) _fit(g);
          }
          return Stack(
            children: [
              if (g != null)
                Positioned.fill(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapUp: (d) => setState(() => g.pointer(d.localPosition.dx, d.localPosition.dy)),
                    onScaleStart: (d) => _lastScale = 1,
                    onScaleUpdate: (d) => setState(() {
                      if (d.pointerCount >= 2) {
                        g.zoomAt(d.scale / _lastScale, d.localFocalPoint.dx, d.localFocalPoint.dy);
                        _lastScale = d.scale;
                      }
                      g.panBy(d.focalPointDelta.dx, d.focalPointDelta.dy);
                    }),
                    child: CustomPaint(painter: BoardPainter(g, _frame), size: size),
                  ),
                ),
              if (g == null)
                Center(
                  child: failed
                      ? Column(mainAxisSize: MainAxisSize.min, children: [
                          const Text('This tangle could not be woven.', style: TextStyle(color: kMuted)),
                          TextButton(onPressed: _load, child: const Text('Try again')),
                        ])
                      : const Column(mainAxisSize: MainAxisSize.min, children: [
                          SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2, color: kAccent)),
                          SizedBox(height: 14),
                          Text('Weaving your tangle…', style: TextStyle(color: kMuted)),
                        ]),
                ),
              Positioned(left: 0, right: 0, top: 0, child: SafeArea(bottom: false, child: _top(g))),
              if (g != null && !(g.usedAuto && !g.ended))
                Positioned(left: 0, right: 0, bottom: 0, child: SafeArea(top: false, child: _actions(g))),
              if (g != null && g.notice.isNotEmpty)
                Center(
                  child: IgnorePointer(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 11),
                      decoration: BoxDecoration(color: const Color(0xffe9f5ee), borderRadius: BorderRadius.circular(30)),
                      child: Text(g.notice,
                          style: const TextStyle(color: Color(0xff122c36), fontSize: 14, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
            ],
          );
        }),
      ),
    );
  }

  Widget _pill({required Widget child}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xd90b222d),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0x12ffffff)),
        ),
        child: child,
      );

  Widget _top(GameState? g) {
    final hex = levelSpec(journeyOpts, index).hex;
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 12, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            tooltip: 'Levels',
            icon: const Icon(Icons.grid_view_rounded, color: kText),
            onPressed: () => Navigator.of(context).pop(),
          ),
          Flexible(
            child: _pill(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('JOURNEY · ${index ~/ 10 + 1} / 12',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10, letterSpacing: 1.2, color: kMuted, fontWeight: FontWeight.w600)),
                  Text('Level ${index + 1}${hex ? ' · Hex' : ''}',
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          if (g != null && !(g.usedAuto && !g.ended))
            _pill(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text.rich(
                      TextSpan(children: [
                        TextSpan(text: '${g.taps}', style: const TextStyle(fontWeight: FontWeight.w800, color: kAccent)),
                        TextSpan(text: ' taps · par ${g.par}', style: const TextStyle(color: kText)),
                      ]),
                      maxLines: 1),
                  Text(g.lost ? 'Knotted' : '${g.ropesLeft} ${g.ropesLeft == 1 ? 'rope' : 'ropes'} left',
                      style: const TextStyle(fontSize: 11, color: kMuted)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _action(IconData icon, String label, String? small, VoidCallback? onTap) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 3),
          child: Opacity(
            opacity: onTap == null ? .35 : 1,
            child: Material(
              color: const Color(0xec173a49),
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: onTap,
                child: SizedBox(
                  height: 56,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(icon, size: 24, color: kText),
                      const SizedBox(height: 2),
                      Text.rich(
                        TextSpan(children: [
                          TextSpan(text: label),
                          if (small != null) TextSpan(text: ' $small', style: const TextStyle(color: kAccent)),
                        ]),
                        style: const TextStyle(fontSize: 10, color: Color(0xffb6d0d7)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );

  Widget _actions(GameState g) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(9, 0, 9, 10),
      child: Row(
        children: [
          _action(Icons.undo_rounded, 'Undo', '${g.undos}', g.canUndo ? () => setState(g.undo) : null),
          _action(Icons.lightbulb_outline_rounded, 'Hint', '+2', g.canHint ? () => setState(g.showHint) : null),
          _action(Icons.auto_fix_high_rounded, 'Solve', '0★', g.canAutoSolve ? () => setState(g.autoSolve) : null),
          _action(Icons.replay_rounded, 'Restart', null, g.ended ? null : () => setState(g.restart)),
          if (g.zoomable) _action(Icons.fit_screen_rounded, 'Fit', null, g.zoom > 1 ? () => setState(g.fit) : null),
          _action(Icons.speed_rounded, 'Speed', widget.progress.speed[0].toUpperCase(), () => setState(_cycleSpeed)),
        ],
      ),
    );
  }

  void _cycleSpeed() {
    final p = widget.progress;
    const order = ['normal', 'fast', 'slow'];
    p.speed = order[(order.indexOf(p.speed) + 1) % order.length];
    p.save();
    game?.speedFactor = moveSpeeds[p.speed] ?? 1;
  }
}
