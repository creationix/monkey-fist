// The Levels page (the web game's chooser). Journey: twelve chapters of ten;
// the first ten are open, clearing a chapter's last level opens the next ten,
// and every level in an open chapter is playable at once. Custom: a set woven
// from a seed, grid, size, difficulty and mechanics, with every level open.
// Both offer Continue for the puzzle in progress and a set link to share.
import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../core/engine.dart';
import '../game/levels.dart';
import '../game/progress.dart';
import 'audio.dart';
import 'game_screen.dart';
import 'theme.dart';
import 'settings_screen.dart';

const _site = 'https://creationix.github.io/monkey-fist/';
const _grids = {'M': 'Square + hex', 'S': 'Square only', 'H': 'Hex only'};

/// The header's one-line description of a set.
String setSummary(SetOpts o) => o.journey
    ? '120 tangles · square + hex'
    : '${o.count} tangles · ${o.w} × ${o.h} · ${const {'M': 'square + hex', 'S': 'square', 'H': 'hex'}[o.grid]}';

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
  final session = PlaySession();
  late SetOpts draft = parseCode(widget.progress.code) ?? journeyOpts;
  late final _seed = TextEditingController(text: draft.seed);
  bool _copied = false;

  String get _code => setCode(draft);

  @override
  void initState() {
    super.initState();
    // Weave the first open level while the menu is showing.
    widget.store.prefetch(_resume(), _code);
  }

  @override
  void dispose() {
    _seed.dispose();
    super.dispose();
  }

  /// The first level without a score.
  int _resume() {
    final scores = widget.progress.scoresFor(_code);
    var i = 0;
    while (scores.containsKey(i)) {
      i++;
    }
    return math.min(i, widget.progress.availableFor(draft) - 1);
  }

  bool get _inSession => session.game != null && setCode(session.opts) == _code;

  Future<void> _open(int index) async {
    final p = widget.progress;
    p.code = _code;
    if (!draft.journey) p.custom = draft;
    p.save();
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => GameScreen(
          opts: draft,
          index: index,
          progress: p,
          store: widget.store,
          audio: widget.audio,
          session: session,
        ),
      ),
    );
    if (mounted) setState(() => _copied = false);
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: '$_site?set=$_code'));
    if (mounted) setState(() => _copied = true);
  }

  /// Show a set; [seed] also puts a Custom seed in the seed field.
  void _show(SetOpts next, {bool seed = true}) => setState(() {
    draft = next;
    _copied = false;
    if (seed && !next.journey) _seed.text = next.seed;
  });

  /// A Custom option changed: show the new set and keep it for next time.
  void _edit(SetOpts next, {bool seed = true}) {
    _show(next, seed: seed);
    if (next.journey) return;
    widget.progress.custom = next;
    widget.progress.save(notify: false);
  }

  void _custom() {
    if (draft.journey) _show(widget.progress.custom ?? customSet());
  }

  /// The seed field also takes a whole set code, Journey's included.
  void _seedChanged(String text) {
    final parsed = parseCode(text);
    if (parsed != null) {
      _edit(parsed);
    } else {
      _edit(draft.edit(seed: text), seed: false);
    }
  }

  void _dice() {
    final random = math.Random.secure();
    const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    _edit(draft.edit(seed: [for (var i = 0; i < 10; i++) digits[random.nextInt(36)]].join()));
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.progress;
    final mq = MediaQuery.of(context);
    final compact = mq.size.height < 500;
    final narrow = mq.size.width <= 600;
    final side = math.max(
      pageSide(mq.size.width),
      math.max(mq.padding.left, mq.padding.right),
    );
    final scale = mq.textScaler;
    return Scaffold(
      body: DecoratedBox(
        decoration: appBackground(p.highContrast),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              // Short landscape screens let the header scroll away.
              pinned: !compact,
              automaticallyImplyLeading: false,
              titleSpacing: 0,
              toolbarHeight: scale.scale(28) + scale.scale(12) + 36,
              flexibleSpace: PageBackdrop(highContrast: p.highContrast),
              title: Padding(
                padding: EdgeInsets.symmetric(horizontal: side),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
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
                            setSummary(draft),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              color: appMuted(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                    SettingsButton(
                      onPressed: () async {
                        await openSettings(context, p, widget.audio);
                        if (mounted) setState(() {});
                      },
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: EdgeInsets.fromLTRB(side, compact ? 4 : 12, side, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _tabs(compact, narrow),
                    SizedBox(height: compact ? 10 : 16),
                    _card(context, compact, narrow),
                  ],
                ),
              ),
            ),
            for (var c = 0; c * 10 < draft.count; c++) ..._group(context, c, p, side),
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                side,
                28,
                side,
                24 + mq.padding.bottom,
              ),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Divider(
                      height: 1,
                      color: Theme.of(context).colorScheme.outlineVariant,
                    ),
                    const SizedBox(height: 15),
                    Text(
                      'Tap to slide. Mirrors turn. Springs reverse.',
                      style: TextStyle(fontSize: 11, color: appMuted(context)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Journey or Custom, as two large toggle buttons.
  Widget _tabs(bool compact, bool narrow) {
    final scheme = Theme.of(context).colorScheme;
    Widget tab(String title, String detail, bool on, VoidCallback tap, Key key) => Expanded(
      child: Semantics(
        button: true,
        selected: on,
        child: Material(
          key: key,
          color: on ? scheme.secondaryContainer : scheme.surfaceContainerLowest,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: on ? kAccent : scheme.outlineVariant),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: tap,
            child: Padding(
              padding: compact
                  ? const EdgeInsets.symmetric(horizontal: 14, vertical: 10)
                  : EdgeInsets.symmetric(horizontal: narrow ? 12 : 16, vertical: narrow ? 12 : 13),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: on ? kAccent : kText,
                    ),
                  ),
                  if (!compact) ...[
                    const SizedBox(height: 5),
                    Text(detail, style: TextStyle(fontSize: 11, color: appMuted(context))),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
    return Row(
      children: [
        tab('Journey', '120 levels', draft.journey, () => _show(journeyOpts), const ValueKey('set-journey')),
        const SizedBox(width: 8),
        tab('Custom', 'Make it yours', !draft.journey, _custom, const ValueKey('set-custom')),
      ],
    );
  }

  /// Stars, the Custom options, the unlock rule, and Play (the first level
  /// without a score) or Continue (the puzzle in progress).
  Widget _card(BuildContext context, bool compact, bool narrow) {
    final scheme = Theme.of(context).colorScheme;
    final total = draft.count * 3;
    final stars = widget.progress.scoresFor(_code).values.fold<int>(0, (a, b) => a + b.stars);
    final resuming = _inSession && session.active;
    final target = resuming ? session.index : _resume();
    final progress = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Your progress',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
            Text(
              '$stars / $total ★',
              style: const TextStyle(fontSize: 13, color: kAccent),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: stars / total,
            minHeight: 4,
            color: kAccent,
            backgroundColor: scheme.surfaceContainerHighest,
          ),
        ),
      ],
    );
    final rule = Text(
      draft.journey
          ? 'Clear each group’s last level to open the next ten. Play any open level.'
          : 'Every level is open. Ropes fill the chosen grid; difficulty changes how much unlocking they need.',
      style: TextStyle(fontSize: 12, height: 1.5, color: appMuted(context)),
    );
    final play = FilledButton.icon(
      key: const ValueKey('home-play'),
      style: FilledButton.styleFrom(
        minimumSize: Size(0, compact ? 44 : 52),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
      onPressed: () => _open(target),
      icon: const Icon(Icons.play_arrow_rounded),
      label: Text('${resuming ? 'Continue' : 'Play'} level ${target + 1}'),
    );
    final share = TextButton(
      onPressed: _copy,
      child: Text(
        _copied ? 'Link copied' : 'Copy set link',
        style: const TextStyle(fontSize: 12, color: kAccent),
      ),
    );
    final options = draft.journey ? null : _options(narrow);
    return Container(
      padding: compact
          ? const EdgeInsets.fromLTRB(18, 14, 18, 14)
          : EdgeInsets.all(narrow ? 16 : 20),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: compact
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [progress, const SizedBox(height: 10), rule],
                      ),
                    ),
                    const SizedBox(width: 24),
                    play,
                    share,
                  ],
                ),
                if (options != null) ...[const SizedBox(height: 16), options],
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                progress,
                if (options != null) ...[const SizedBox(height: 16), options],
                const SizedBox(height: 16),
                rule,
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: play),
                    const SizedBox(width: 12),
                    share,
                  ],
                ),
              ],
            ),
    );
  }

  /// The Custom set's options, laid out like the web game's form: two columns
  /// wider than 600 pixels, one below.
  Widget _options(bool narrow) {
    final o = draft;
    final lo = o.mirrors || o.springs ? 8 : 4, hi = o.colossal ? 48 : 24;
    final scheme = Theme.of(context).colorScheme;
    final field = BoxDecoration(
      color: scheme.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: scheme.outlineVariant),
    );
    Widget pair(Widget a, Widget b) => narrow
        ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [a, const SizedBox(height: 8), b])
        : Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [Expanded(child: a), const SizedBox(width: 16), Expanded(child: b)],
          );
    Widget group(String legend, Widget a, Widget b) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(legend, style: TextStyle(fontSize: 12, color: appMuted(context))),
        const SizedBox(height: 10),
        pair(a, b),
      ],
    );
    Widget hint(String text) => Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Text(text, style: TextStyle(fontSize: 12, color: appMuted(context))),
    );
    Widget square(IconData icon, String tip, VoidCallback onTap, Key key) => SizedBox(
      width: 48,
      height: 48,
      child: IconButton.filledTonal(
        key: key,
        tooltip: tip,
        onPressed: onTap,
        style: IconButton.styleFrom(
          backgroundColor: scheme.surfaceContainerHighest,
          side: BorderSide(color: scheme.outlineVariant),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        icon: Icon(icon, size: 22, color: kText),
      ),
    );
    final grid = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _label('Grid'),
        const SizedBox(height: 7),
        Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: field,
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              key: const ValueKey('custom-grid'),
              value: o.grid,
              isExpanded: true,
              dropdownColor: scheme.surface,
              borderRadius: BorderRadius.circular(12),
              style: const TextStyle(fontSize: 16, color: kText),
              items: [
                for (final e in _grids.entries) DropdownMenuItem(value: e.key, child: Text(e.value)),
              ],
              onChanged: (v) => _edit(o.edit(grid: v)),
            ),
          ),
        ),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _label('Seed or set code'),
        const SizedBox(height: 7),
        Row(
          children: [
            Expanded(
              child: TextField(
                key: const ValueKey('custom-seed'),
                controller: _seed,
                onChanged: _seedChanged,
                maxLength: 48,
                autocorrect: false,
                enableSuggestions: false,
                textCapitalization: TextCapitalization.characters,
                style: const TextStyle(fontSize: 16),
                decoration: InputDecoration(
                  counterText: '',
                  isDense: true,
                  filled: true,
                  fillColor: scheme.surfaceContainerLowest,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: scheme.outlineVariant),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: kAccent, width: 2),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 7),
            square(Icons.casino_outlined, 'Random seed', _dice, const ValueKey('custom-dice')),
            const SizedBox(width: 7),
            square(Icons.replay_rounded, 'Restore default seed', () => _edit(o.edit(seed: 'MONKEYFIST')),
                const ValueKey('custom-default-seed')),
          ],
        ),
        const SizedBox(height: 16),
        pair(grid, _slider('Levels', o.count, 1, 200, 'levels', (v) => _edit(o.edit(count: v)))),
        const SizedBox(height: 16),
        group(
          'Difficulty · 1 to 100',
          _slider('From', o.min, 1, 100, 'out of 100', (v) => _edit(o.edit(min: v, max: math.max(v, o.max)))),
          _slider('To', o.max, 1, 100, 'out of 100', (v) => _edit(o.edit(max: v, min: math.min(v, o.min)))),
        ),
        const SizedBox(height: 16),
        group(
          'Size · grid dimensions',
          _slider('Width', o.w, lo, hi, 'columns', (v) => _edit(o.edit(w: v))),
          _slider('Height', o.h, lo, hi, 'rows', (v) => _edit(o.edit(h: v))),
        ),
        if (lo == 8) hint('Mirrors and springs need at least an 8 × 8 grid.'),
        const SizedBox(height: 12),
        Wrap(
          spacing: 30,
          runSpacing: 4,
          children: [
            _check('Mirrors', o.mirrors, (v) => _edit(o.edit(mirrors: v))),
            _check('Springs', o.springs, (v) => _edit(o.edit(springs: v))),
            _check('Colossal maps', o.colossal, (v) => _edit(o.edit(colossal: v))),
          ],
        ),
        if (o.colossal) hint('Enables grids up to 48 × 48. Use zoom to explore.'),
      ],
    );
  }

  Widget _label(String text) => Text(text, style: TextStyle(fontSize: 15, color: appMuted(context)));

  Widget _slider(String label, int value, int min, int max, String unit, ValueChanged<int> change) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Row(
        children: [
          Expanded(child: _label(label)),
          Text(
            '$value',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: kAccent,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
      SizedBox(
        height: 44,
        child: SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 6,
            activeTrackColor: const Color(0xff365965),
            inactiveTrackColor: const Color(0xff365965),
            thumbShape: const _Thumb(),
            trackShape: const RoundedRectSliderTrackShape(),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 22),
            overlayColor: kAccent.withValues(alpha: .12),
            tickMarkShape: SliderTickMarkShape.noTickMark,
            showValueIndicator: ShowValueIndicator.never,
            // The thumb reaches the field's edges, as the web range input's does.
            padding: const EdgeInsets.symmetric(horizontal: 14),
          ),
          child: Slider(
            key: ValueKey('custom-${label.toLowerCase()}'),
            value: value.toDouble(),
            min: min.toDouble(),
            max: max.toDouble(),
            divisions: max > min ? max - min : null,
            semanticFormatterCallback: (v) => '${v.round()} $unit',
            onChanged: max > min ? (v) => change(v.round()) : null,
          ),
        ),
      ),
    ],
  );

  Widget _check(String label, bool value, ValueChanged<bool> change) => MergeSemantics(
    child: InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => change(!value),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                key: ValueKey('custom-${label.split(' ').first.toLowerCase()}'),
                value: value,
                onChanged: (v) => change(v ?? false),
                activeColor: kAccent,
                checkColor: kOnAccent,
                side: BorderSide(color: appMuted(context), width: 1.5),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontSize: 15)),
          ],
        ),
      ),
    ),
  );

  /// A group of ten levels: a Journey chapter (locked until the one before is
  /// cleared) or a range of Custom levels.
  List<Widget> _group(BuildContext context, int c, Progress p, double side) {
    final first = c * 10, last = math.min(draft.count, first + 10);
    final open = first < p.availableFor(draft);
    final range = 'Levels ${first + 1}–$last';
    final current = _inSession ? session.index : _resume();
    final scores = p.scoresFor(_code);
    final title = TextStyle(fontSize: 17, fontWeight: FontWeight.w700);
    return [
      SliverPadding(
        padding: EdgeInsets.fromLTRB(side, 22, side, 12),
        sliver: SliverToBoxAdapter(
          child: draft.journey
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('Chapter ${c + 1}', style: title)),
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
                      '$range${open ? '' : ' · Clear level $first to unlock'}',
                      style: TextStyle(fontSize: 12, color: appMuted(context)),
                    ),
                  ],
                )
              : Text(range, style: title),
        ),
      ),
      SliverPadding(
        padding: EdgeInsets.symmetric(horizontal: side),
        sliver: SliverLayoutBuilder(
          builder: (context, constraints) {
            final scale = MediaQuery.textScalerOf(context);
            final measure = TextPainter(
              text: const TextSpan(
                text: '200',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              textScaler: scale,
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
                  math.max(width, 58),
                  scale.scale(18) + scale.scale(10) + 13 + 24,
                ),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, k) => _levelButton(first + k, open, scores[first + k], first + k == current),
                childCount: last - first,
              ),
            );
          },
        ),
      ),
    ];
  }

  Widget _levelButton(int i, bool open, Best? best, bool current) {
    final scheme = Theme.of(context).colorScheme;
    final hc = widget.progress.highContrast;
    final hex = levelSpec(draft, i).hex;
    return Opacity(
      opacity: open ? 1 : (hc ? .65 : .45),
      child: Semantics(
        button: true,
        enabled: open,
        excludeSemantics: true,
        onTap: open ? () => _open(i) : null,
        label:
            'Level ${i + 1}, ${hex ? 'hex' : 'square'}${!open ? ', locked' : best == null ? '' : ', ${best.stars} stars'}',
        child: Material(
          color: best != null && !hc ? kSolved : scheme.surfaceContainerHighest,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: current
                ? const BorderSide(color: kAccent)
                : hc
                ? BorderSide(color: scheme.outlineVariant)
                : BorderSide.none,
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: open ? () => _open(i) : null,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                GridIcon(hex: hex),
                const SizedBox(height: 2),
                Text(
                  '${i + 1}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  best == null ? '' : '★' * best.stars + '☆' * (3 - best.stars),
                  style: const TextStyle(
                    fontSize: 10,
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

/// The web slider's thumb: an accent disc with a dark rim and a soft shadow.
class _Thumb extends SliderComponentShape {
  const _Thumb();

  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) => const Size.square(28);

  @override
  void paint(
    PaintingContext context,
    Offset center, {
    required Animation<double> activationAnimation,
    required Animation<double> enableAnimation,
    required bool isDiscrete,
    required TextPainter labelPainter,
    required RenderBox parentBox,
    required SliderThemeData sliderTheme,
    required TextDirection textDirection,
    required double value,
    required double textScaleFactor,
    required Size sizeWithOverflow,
  }) {
    final canvas = context.canvas;
    canvas.drawCircle(
      center.translate(0, 2),
      14,
      Paint()
        ..color = const Color(0x55000000)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5),
    );
    final pressed = activationAnimation.value > .5;
    canvas.drawCircle(center, 14, Paint()..color = pressed ? const Color(0xffffda99) : kAccent);
    canvas.drawCircle(
      center,
      13,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = const Color(0xff17313a),
    );
  }
}
