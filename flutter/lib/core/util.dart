// Shared board types and the JS semantics the generator depends on: 32-bit
// wrapping hashes (mulberry32, FNV-1a), Math.round, floor division, a stable
// sort and Number(x.toFixed(n)). Pure Dart: no Flutter imports.

/// A cell. Square boards read q as x and r as y; Hex boards use axial q/r.
class Pt {
  final int q;
  final int r;
  const Pt(this.q, this.r);
  @override
  bool operator ==(Object other) => other is Pt && other.q == q && other.r == r;
  @override
  int get hashCode => (q + 4096) * 8192 + r + 4096;
  @override
  String toString() => '($q,$r)';
}

typedef Path = List<Pt>;

/// A fixed two-sided mirror. Square: kind 0 is '/', 1 is '\'. Hex: kind is the axis (0-2).
class Mirror {
  final Pt cell;
  final int kind;
  const Mirror(this.cell, this.kind);
}

class Board {
  final bool hex;
  final int w;
  final int h;
  final List<Path> ropes;
  final List<Mirror> mirrors;
  final List<Pt> springs;
  List<int> plan;
  Board({
    required this.hex,
    required this.w,
    required this.h,
    required this.ropes,
    required this.mirrors,
    required this.springs,
    required this.plan,
  });
  Board withSprings(List<Pt> springs, List<int> plan) =>
      Board(hex: hex, w: w, h: h, ropes: ropes, mirrors: mirrors, springs: springs, plan: plan);
  Board withPlan(List<int> plan) =>
      Board(hex: hex, w: w, h: h, ropes: ropes, mirrors: mirrors, springs: springs, plan: plan);
}

List<Path?> somePaths(List<Path> ropes) => List<Path?>.of(ropes);

bool allGone(List<Path?> paths) {
  for (final p in paths) {
    if (p != null) return false;
  }
  return true;
}

Pt lastPt(Path p) => p[p.length - 1];

// ---------------------------------------------------------------- random

const int _m32 = 0xFFFFFFFF;

/// Math.imul for unsigned 32-bit inputs, as an unsigned 32-bit result. Split so
/// no intermediate product needs more than 53 bits (safe on any Dart platform).
int imul32(int a, int b) {
  a &= _m32;
  b &= _m32;
  final aHi = a >> 16, aLo = a & 0xFFFF;
  final bHi = b >> 16, bLo = b & 0xFFFF;
  final mid = ((aHi * bLo + aLo * bHi) & 0xFFFF) << 16;
  return (mid + aLo * bLo) & _m32;
}

/// mulberry32 from random.js, bit for bit. The state is kept as an unsigned 32-bit int.
class Rng {
  int a;
  Rng(int seed) : a = seed & _m32;
  double next() {
    a = (a + 0x6D2B79F5) & _m32;
    final x = a;
    var t = imul32(x ^ (x >> 15), 1 | x);
    t = ((t + imul32(t ^ (t >> 7), 61 | t)) & _m32) ^ t;
    return ((t ^ (t >> 14)) & _m32) / 4294967296.0;
  }

  /// Math.floor(rng() * n).
  int below(int n) => (next() * n).floor();
}

/// FNV-1a over UTF-16 code units, as hashString in random.js (unsigned 32-bit).
int hashString(String s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h = imul32(h ^ s.codeUnitAt(i), 0x01000193);
  }
  return h;
}

Rng rngOf(String s) => Rng(hashString(s));

/// Number.prototype.toString(36) for an unsigned 32-bit value.
String base36(int u) => u.toRadixString(36);

/// Math.round: halves round up, toward +Infinity.
int jsRound(double x) {
  final f = x.floorToDouble();
  return x - f >= 0.5 ? f.toInt() + 1 : f.toInt();
}

/// Math.floor(a / b) for b > 0.
int floorDiv(int a, int b) => a >= 0 ? a ~/ b : -((-a + b - 1) ~/ b);

/// Number(x.toFixed(digits)). Dart's toStringAsFixed uses the same
/// double-conversion algorithm as V8, so this is exact.
double toFixed(double x, int digits) => double.parse(x.toStringAsFixed(digits));

/// Array.prototype.sort is stable in V8 (TimSort). Dart's List.sort is not, so
/// every sort that the generator's output depends on goes through this.
void ssort<T>(List<T> a, int Function(T, T) cmp) {
  final n = a.length;
  if (n < 2) return;
  if (n <= 24) {
    for (var i = 1; i < n; i++) {
      final x = a[i];
      var j = i - 1;
      while (j >= 0 && cmp(a[j], x) > 0) {
        a[j + 1] = a[j];
        j--;
      }
      a[j + 1] = x;
    }
    return;
  }
  final buf = List<T>.of(a);
  _mergeSort(a, buf, 0, n, cmp);
}

void _mergeSort<T>(List<T> a, List<T> buf, int lo, int hi, int Function(T, T) cmp) {
  if (hi - lo <= 16) {
    for (var i = lo + 1; i < hi; i++) {
      final x = a[i];
      var j = i - 1;
      while (j >= lo && cmp(a[j], x) > 0) {
        a[j + 1] = a[j];
        j--;
      }
      a[j + 1] = x;
    }
    return;
  }
  final mid = (lo + hi) >> 1;
  _mergeSort(a, buf, lo, mid, cmp);
  _mergeSort(a, buf, mid, hi, cmp);
  for (var k = lo; k < hi; k++) {
    buf[k] = a[k];
  }
  var i = lo, j = mid, k = lo;
  while (i < mid && j < hi) {
    if (cmp(buf[j], buf[i]) < 0) {
      a[k++] = buf[j++];
    } else {
      a[k++] = buf[i++];
    }
  }
  while (i < mid) {
    a[k++] = buf[i++];
  }
  while (j < hi) {
    a[k++] = buf[j++];
  }
}

int imin(int a, int b) => a < b ? a : b;
int imax(int a, int b) => a > b ? a : b;
double dmin(double a, double b) => a < b ? a : b;
double dmax(double a, double b) => a > b ? a : b;

/// Index of the first occurrence of x in a at or after `from`, or -1.
int indexFrom(List<int> a, int x, int from) {
  for (var k = from; k < a.length; k++) {
    if (a[k] == x) return k;
  }
  return -1;
}

bool containsInt(List<int> a, int x) => indexFrom(a, x, 0) >= 0;

/// [...new Set(a)]: first occurrences, in order.
List<int> unique(List<int> a) {
  final out = <int>[];
  for (final x in a) {
    if (!containsInt(out, x)) out.add(x);
  }
  return out;
}

/// A key for a list of small ints (>= -1), for visited sets.
String keyOf(List<int> a) {
  final codes = List<int>.filled(a.length, 0);
  for (var i = 0; i < a.length; i++) {
    codes[i] = a[i] + 1;
  }
  return String.fromCharCodes(codes);
}

/// Thrown where the JS throws on an impossible board.
class GenError implements Exception {
  final String message;
  GenError(this.message);
  @override
  String toString() => 'GenError: $message';
}
