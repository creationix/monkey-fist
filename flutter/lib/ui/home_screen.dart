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

class HomeScreen extends StatefulWidget {
  final Progress progress;
  final LevelStore store;
  final SfxPlayer audio;
  const HomeScreen({super.key, required this.progress, required this.store, required this.audio});

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
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => GameScreen(index: index, progress: widget.progress, store: widget.store, audio: widget.audio),
    ));
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.progress;
    return Scaffold(
      body: DecoratedBox(
        decoration: backgroundGradient,
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _header(context)),
              for (var c = 0; c < 12; c++) ..._chapter(context, c, p),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    final p = widget.progress;
    final stars = p.scores.values.fold<int>(0, (a, b) => a + b.stars);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 12, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Monkey Fist', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('Journey · $stars ★ of 360', style: const TextStyle(color: kMuted)),
              ],
            ),
          ),
          IconButton(
            tooltip: p.sound ? 'Sound on' : 'Sound off',
            icon: Icon(p.sound ? Icons.volume_up_rounded : Icons.volume_off_rounded, color: kMuted),
            onPressed: () => setState(() {
              p.sound = !p.sound;
              widget.audio.enabled = p.sound;
              p.save();
            }),
          ),
          FilledButton(
            onPressed: () => _open(_resume()),
            child: Text('Play ${_resume() + 1}'),
          ),
        ],
      ),
    );
  }

  List<Widget> _chapter(BuildContext context, int c, Progress p) {
    final open = c * 10 < p.available;
    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
          child: Text(
            'LEVELS ${c * 10 + 1}–${c * 10 + 10}${open ? '' : ' · clear ${c * 10} to open'}',
            style: const TextStyle(fontSize: 12, letterSpacing: 1.2, color: kMuted, fontWeight: FontWeight.w600),
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 72, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 1),
          delegate: SliverChildBuilderDelegate(
            (context, k) => _levelButton(c * 10 + k, open, p),
            childCount: 10,
          ),
        ),
      ),
    ];
  }

  Widget _levelButton(int i, bool open, Progress p) {
    final best = p.scores[i];
    final spec = journeyOpts;
    final hex = levelSpec(spec, i).hex;
    return Opacity(
      opacity: open ? 1 : .35,
      child: Material(
        color: best != null ? const Color(0xff2b4a50) : kButton,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: open ? () => _open(i) : null,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('${i + 1}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(
                best == null ? (hex ? 'HEX' : '') : '★' * best.stars + '☆' * (3 - best.stars),
                style: TextStyle(fontSize: best == null ? 9 : 11, letterSpacing: 1, color: kAccent),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
