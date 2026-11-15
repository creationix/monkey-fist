import 'package:monkey_fist/game/levels.dart';
import 'package:test/test.dart';

void main() {
  test('cached levels do not prevent generating later levels', () async {
    final store = LevelStore();
    expect(await store.get(0), isNotNull);
    expect(await store.get(1), isNotNull);
    expect(await store.get(2), isNotNull);
  });

  test('prefetch and opening another level can run together', () async {
    final store = LevelStore();
    store.prefetch(0);
    final levels = await Future.wait([store.get(1), store.get(2)]);
    expect(levels, everyElement(isNotNull));
    expect(await store.get(0), isNotNull);
  });
}
