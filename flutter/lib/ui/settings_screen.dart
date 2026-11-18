import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../game/progress.dart';
import 'audio.dart';
import 'theme.dart';

/// The same entry point, in the same corner, on the journey and puzzle screens.
class SettingsButton extends StatelessWidget {
  final VoidCallback onPressed;
  const SettingsButton({super.key, required this.onPressed});
  @override
  Widget build(BuildContext context) => IconButton.filledTonal(
    tooltip: 'Settings',
    onPressed: onPressed,
    icon: const Icon(Icons.settings_outlined),
    constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
  );
}

Future<void> openSettings(
  BuildContext context,
  Progress progress,
  SfxPlayer audio,
) => Navigator.of(context).push<void>(
  MaterialPageRoute(
    builder: (_) => SettingsScreen(progress: progress, audio: audio),
  ),
);

class SettingsScreen extends StatefulWidget {
  final Progress progress;
  final SfxPlayer audio;
  const SettingsScreen({
    super.key,
    required this.progress,
    required this.audio,
  });
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  void _change(VoidCallback update) {
    setState(() {
      update();
      widget.progress.save();
      widget.audio.setSetting(widget.progress.soundLevel);
      widget.audio.music.setSetting(widget.progress.music);
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.progress;
    final mq = MediaQuery.of(context);
    final side = math.max(
      pageSide(mq.size.width, max: 600),
      math.max(mq.padding.left, mq.padding.right),
    );
    final music = widget.audio.music.supported;
    return Scaffold(
      body: DecoratedBox(
        decoration: appBackground(p.highContrast),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              // Back stays reachable however far the page scrolls.
              pinned: true,
              automaticallyImplyLeading: false,
              titleSpacing: 0,
              toolbarHeight: 72,
              flexibleSpace: PageBackdrop(highContrast: p.highContrast),
              title: Padding(
                padding: EdgeInsets.symmetric(horizontal: side - 10),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: 'Back',
                      icon: const Icon(Icons.arrow_back_rounded),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Settings',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                side,
                8,
                side,
                24 + mq.padding.bottom,
              ),
              sliver: SliverList.list(
                children: [
                  _section('AUDIO', [
                    _choice(
                      'sound',
                      'Sound effects',
                      Icons.volume_up_outlined,
                      p.soundLevel,
                      const {'off': 'Off', 'soft': 'Soft', 'full': 'Full'},
                      (v) => _change(() => p.soundLevel = v),
                    ),
                    if (music) ...[
                      const SizedBox(height: 24),
                      _choice(
                        'music',
                        'Music',
                        Icons.music_note_outlined,
                        p.music,
                        const {'off': 'Off', 'soft': 'Soft', 'full': 'Full'},
                        (v) => _change(() => p.music = v),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Music plays during puzzles and pauses in menus.',
                        style: TextStyle(
                          fontSize: 12,
                          color: appMuted(context),
                        ),
                      ),
                    ],
                  ]),
                  _section('GAMEPLAY', [
                    _choice(
                      'speed',
                      'Movement speed',
                      Icons.speed_rounded,
                      p.speed,
                      const {
                        'slow': 'Slow',
                        'normal': 'Normal',
                        'fast': 'Fast',
                      },
                      (v) => _change(() => p.speed = v),
                    ),
                  ]),
                  _section('APPEARANCE', [
                    _choice(
                      'graphics',
                      'Art style',
                      Icons.layers_outlined,
                      p.graphics,
                      const {'rope': 'Rope', 'tiles': 'Tiles'},
                      (v) => _change(() => p.graphics = v),
                    ),
                    const SizedBox(height: 24),
                    const Divider(height: 1),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      key: const ValueKey('settings-contrast'),
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'High contrast',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      subtitle: const Text(
                        'Black backgrounds and clearer grid lines.',
                        style: TextStyle(fontSize: 12),
                      ),
                      value: p.highContrast,
                      onChanged: (v) => _change(() => p.highContrast = v),
                    ),
                  ]),
                  Text(
                    'Changes are saved automatically.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: appMuted(context)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, List<Widget> children) => Padding(
    padding: const EdgeInsets.only(bottom: 28),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 11,
            letterSpacing: 1.8,
            fontWeight: FontWeight.w700,
            color: appMuted(context),
          ),
        ),
        const SizedBox(height: 12),
        Material(
          color: Theme.of(context).colorScheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
            side: BorderSide(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ),
      ],
    ),
  );

  Widget _choice(
    String id,
    String label,
    IconData icon,
    String value,
    Map<String, String> options,
    ValueChanged<String> change,
  ) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Row(
        children: [
          Icon(icon, size: 20, color: appMuted(context)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
      const SizedBox(height: 14),
      LayoutBuilder(
        builder: (context, constraints) {
          var widest = 0.0;
          for (final label in options.values) {
            final measure = TextPainter(
              text: TextSpan(
                text: label,
                style: Theme.of(context).textTheme.labelLarge,
              ),
              textScaler: MediaQuery.textScalerOf(context),
              textDirection: Directionality.of(context),
            )..layout();
            if (measure.width > widest) widest = measure.width;
            measure.dispose();
          }
          final vertical =
              (widest + 24) * options.length > constraints.maxWidth;
          return SizedBox(
            width: constraints.maxWidth,
            child: SegmentedButton<String>(
              key: ValueKey('settings-$id'),
              showSelectedIcon: false,
              direction: vertical ? Axis.vertical : Axis.horizontal,
              expandedInsets: vertical ? null : EdgeInsets.zero,
              segments: [
                for (final e in options.entries)
                  ButtonSegment(value: e.key, label: Text(e.value)),
              ],
              selected: {value},
              onSelectionChanged: (v) => change(v.single),
              style: ButtonStyle(
                minimumSize: const WidgetStatePropertyAll(Size(0, 48)),
                padding: const WidgetStatePropertyAll(
                  EdgeInsets.symmetric(horizontal: 8),
                ),
                backgroundColor: WidgetStateProperty.resolveWith(
                  (states) => states.contains(WidgetState.selected)
                      ? kAccent
                      : Theme.of(context).colorScheme.surface,
                ),
                foregroundColor: WidgetStateProperty.resolveWith(
                  (states) => states.contains(WidgetState.selected)
                      ? const Color(0xff14242a)
                      : kText,
                ),
              ),
            ),
          );
        },
      ),
    ],
  );
}
