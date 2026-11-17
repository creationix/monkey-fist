import 'dart:math' as math;

// The Journey level list: twelve groups of ten. The first ten are open; clearing
// a group's last level opens the next ten, and every level in an open group is
// playable at once.
import 'package:material_ui/material_ui.dart';

import '../core/engine.dart';
import '../game/levels.dart';
import '../game/progress.dart';
import 'audio.dart';
import 'game_screen.dart';
import 'theme.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  final Progress progress;
  final LevelStore store;
  final SfxPlayer audio;
  const HomeScreen({
    super.key,
    required this.progress,
    required this.store,
    required this.audio,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Weave the first open level while the menu is showing.
    widget.store.prefetch(_resume());
  }

  int _resume() {
    final p = widget.progress;
    for (var i = 0; i < p.available; i++) {
      if (!p.scores.containsKey(i)) return i;
    }
    return p.available - 1;
  }

  Future<void> _open(int index) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => GameScreen(
          index: index,
          progress: widget.progress,
          store: widget.store,
          audio: widget.audio,
        ),
      ),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.progress;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        toolbarHeight: MediaQuery.textScalerOf(context).scale(28) + 52,
        titleSpacing: 24,
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Monkey Fist',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: -.7,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '120 puzzles · Square + Hex',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: appMuted(context)),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: SettingsButton(
              onPressed: () async {
                await openSettings(context, p, widget.audio);
                if (mounted) setState(() {});
              },
            ),
          ),
        ],
      ),
      body: DecoratedBox(
        decoration: appBackground(p.highContrast),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 840),
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(child: _header(context)),
                  for (var c = 0; c < 12; c++) ..._chapter(context, c, p),
                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    final stars = widget.progress.scores.values.fold<int>(
      0,
      (a, b) => a + b.stars,
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Your journey',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
                Text(
                  '$stars / 360 ★',
                  style: const TextStyle(fontSize: 13, color: kAccent),
                ),
              ],
            ),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: stars / 360,
                minHeight: 4,
                color: kAccent,
                backgroundColor: Theme.of(context)
                    .colorScheme
                    .surfaceContainerHighest,
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
              onPressed: () => _open(_resume()),
              icon: const Icon(Icons.play_arrow_rounded),
              label: Text('Play level ${_resume() + 1}'),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _chapter(BuildContext context, int c, Progress p) {
    final open = c * 10 < p.available;
    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Chapter ${c + 1}',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  if (!open)
                    Icon(
                      Icons.lock_outline_rounded,
                      size: 16,
                      color: appMuted(context),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Levels ${c * 10 + 1}–${c * 10 + 10}${open ? '' : ' · Clear level ${c * 10} to unlock'}',
                style: TextStyle(fontSize: 12, color: appMuted(context)),
              ),
            ],
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        sliver: SliverLayoutBuilder(
          builder: (context, constraints) {
            final measure = TextPainter(
              text: const TextSpan(
                text: '120',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              textScaler: MediaQuery.textScalerOf(context),
              textDirection: Directionality.of(context),
            )..layout();
            final minimum = math.max(48.0, measure.width + 24);
            measure.dispose();
            final columns =
                ((constraints.crossAxisExtent + 10) / (minimum + 10))
                    .floor()
                    .clamp(1, 10);
            final width =
                (constraints.crossAxisExtent - (columns - 1) * 10) / columns;
            return SliverGrid(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                mainAxisExtent: math.max(
                  width,
                  MediaQuery.textScalerOf(context).scale(18) +
                      MediaQuery.textScalerOf(context).scale(11) +
                      24,
                ),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, k) => _levelButton(c * 10 + k, open, p),
                childCount: 10,
              ),
            );
          },
        ),
      ),
    ];
  }

  Widget _levelButton(int i, bool open, Progress p) {
    final best = p.scores[i];
    final spec = journeyOpts;
    final hex = levelSpec(spec, i).hex;
    return Opacity(
      opacity: open
          ? 1
          : p.highContrast
          ? .65
          : .45,
      child: Semantics(
        button: true,
        enabled: open,
        excludeSemantics: true,
        onTap: open ? () => _open(i) : null,
        label:
            'Level ${i + 1}${hex ? ', Hex' : ', Square'}${best == null ? '' : ', ${best.stars} stars'}',
        child: Material(
          color: best != null && !p.highContrast
              ? const Color(0xff2b4a50)
              : Theme.of(context).colorScheme.surfaceContainerHighest,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(
              color: p.highContrast
                  ? Theme.of(context).colorScheme.outlineVariant
                  : Colors.transparent,
            ),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: open ? () => _open(i) : null,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '${i + 1}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  best == null
                      ? (hex ? 'HEX' : '')
                      : '★' * best.stars + '☆' * (3 - best.stars),
                  style: TextStyle(
                    fontSize: best == null ? 9 : 11,
                    letterSpacing: 1,
                    color: kAccent,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
