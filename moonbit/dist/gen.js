(() => {
  const $reinterpret_view = new DataView(new ArrayBuffer(8));
  function $i64_reinterpret_f64(a) {
    $reinterpret_view.setBigUint64(0, BigInt.asUintN(64, a), false);
    return $reinterpret_view.getFloat64(0, false);
  }
  function _M0TP310monkeyfist2mf4core5Style(param0, param1, param2, param3, param4) {
    this.name = param0;
    this.min_len = param1;
    this.straight = param2;
    this.len_lo = param3;
    this.twisty = param4;
  }
  function _M0TPB5ArrayGiE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPC13ref3RefGiE(param0) {
    this.val = param0;
  }
  function _M0TP310monkeyfist2mf4core4Spec(param0, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10) {
    this.hex = param0;
    this.w = param1;
    this.h = param2;
    this.difficulty = param3;
    this.mirrors = param4;
    this.springs = param5;
    this.seed = param6;
    this.require_slide = param7;
    this.min_mirrors = param8;
    this.min_springs = param9;
    this.colossal = param10;
  }
  function _M0TP310monkeyfist2mf4core7SetOpts(param0, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10) {
    this.journey = param0;
    this.grid = param1;
    this.min = param2;
    this.max = param3;
    this.w = param4;
    this.h = param5;
    this.count = param6;
    this.mirrors = param7;
    this.springs = param8;
    this.colossal = param9;
    this.seed = param10;
  }
  function _M0TPB5ArrayGdE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPC13ref3RefGORP310monkeyfist2mf4core5LevelE(param0) {
    this.val = param0;
  }
  function _M0TP310monkeyfist2mf4core4Snap(param0, param1, param2) {
    this.event = param0;
    this.distance = param1;
    this.blocker = param2;
  }
  function _M0TPC16string10StringView(param0, param1, param2) {
    this.str = param0;
    this.start = param1;
    this.end = param2;
  }
  function $oob() {
    throw new Error("Index out of bounds");
  }
  class $PanicError extends Error {}
  function $panic(message) {
    throw new $PanicError(message);
  }
  function _M0TPB13StringBuilder(param0) {
    this.val = param0;
  }
  const _M0FPB12random__seed = () => {
    if (globalThis.crypto?.getRandomValues) {
      const array = new Uint32Array(1);
      globalThis.crypto.getRandomValues(array);
      return array[0] | 0; // Convert to signed 32
    } else {
      return Math.floor(Math.random() * 0x100000000) | 0; // Fallback to Math.random
    }
  };
  const _M0FPB19int__to__string__js = (x, radix) => {
    return x.toString(radix);
  };
  const _M0FPB20uint__to__string__js = (x, radix) => {
    return (x >>> 0).toString(radix);
  };
  function _M0TPB4IterGRPC16string10StringViewE(param0, param1) {
    this.f = param0;
    this.size_hint = param1;
  }
  function _M0TPB4IterGcE(param0, param1) {
    this.f = param0;
    this.size_hint = param1;
  }
  function _M0TPB4IterGiE(param0, param1) {
    this.f = param0;
    this.size_hint = param1;
  }
  function _M0TPB4IterGbE(param0, param1) {
    this.f = param0;
    this.size_hint = param1;
  }
  function $make_array_len_and_init(a, b) {
    const arr = new Array(a);
    arr.fill(b);
    return arr;
  }
  function _M0TPB8MutLocalGiE(param0) {
    this.val = param0;
  }
  const _M0FPB22js__code__unit__string = (c) => String.fromCharCode(c);
  const _M0FPB13js__index__of = (s, start, end, p) => {
    if (end - start < p.length) return -1;
    if (end === s.length) return s.indexOf(p, start);
    const i = s.substring(start, end).indexOf(p);
    return i < 0 ? i : start + i;
  };
  const _M0FPB13js__substring = (s, start, end) => start === 0 && end === s.length ? s : s.substring(start, end);
  function _M0TPB5ArrayGsE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB4IterGsE(param0, param1) {
    this.f = param0;
    this.size_hint = param1;
  }
  function _M0TPB8MutLocalGORPC16string10StringViewE(param0) {
    this.val = param0;
  }
  function _M0TPB9ArrayViewGbE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TPB9ArrayViewGiE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TPB5ArrayGORP310monkeyfist2mf4core4SnapE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB5ArrayGAiE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB5ArrayGcE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB3MapGsiE(param0, param1, param2, param3, param4, param5, param6) {
    this.entries = param0;
    this.size = param1;
    this.capacity = param2;
    this.capacity_mask = param3;
    this.grow_at = param4;
    this.head = param5;
    this.tail = param6;
  }
  function _M0TPB3MapGiiE(param0, param1, param2, param3, param4, param5, param6) {
    this.entries = param0;
    this.size = param1;
    this.capacity = param2;
    this.capacity_mask = param3;
    this.grow_at = param4;
    this.head = param5;
    this.tail = param6;
  }
  function _M0TPB3MapGsbE(param0, param1, param2, param3, param4, param5, param6) {
    this.entries = param0;
    this.size = param1;
    this.capacity = param2;
    this.capacity_mask = param3;
    this.grow_at = param4;
    this.head = param5;
    this.tail = param6;
  }
  function _M0TPB3MapGibE(param0, param1, param2, param3, param4, param5, param6) {
    this.entries = param0;
    this.size = param1;
    this.capacity = param2;
    this.capacity_mask = param3;
    this.grow_at = param4;
    this.head = param5;
    this.tail = param6;
  }
  function _M0TPB5EntryGsiE(param0, param1, param2, param3, param4, param5) {
    this.prev = param0;
    this.next = param1;
    this.psl = param2;
    this.hash = param3;
    this.key = param4;
    this.value = param5;
  }
  function _M0TPB5EntryGiiE(param0, param1, param2, param3, param4, param5) {
    this.prev = param0;
    this.next = param1;
    this.psl = param2;
    this.hash = param3;
    this.key = param4;
    this.value = param5;
  }
  function _M0TPB5EntryGsbE(param0, param1, param2, param3, param4, param5) {
    this.prev = param0;
    this.next = param1;
    this.psl = param2;
    this.hash = param3;
    this.key = param4;
    this.value = param5;
  }
  function _M0TPB5EntryGibE(param0, param1, param2, param3, param4, param5) {
    this.prev = param0;
    this.next = param1;
    this.psl = param2;
    this.hash = param3;
    this.key = param4;
    this.value = param5;
  }
  function _M0TPB8MutLocalGORPB5EntryGibEE(param0) {
    this.val = param0;
  }
  function _M0TPB9ArrayViewGRP310monkeyfist2mf4core2PtE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TPB12MutArrayViewGUiiEE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TPB12MutArrayViewGiE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TPB5ArrayGRPB10TimSortRunE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB10TimSortRun(param0, param1) {
    this.len = param0;
    this.start = param1;
  }
  function _M0TPB5ArrayGORPB5ArrayGRP310monkeyfist2mf4core2PtEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB9ArrayViewGsE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TPC13set3SetGsE(param0, param1, param2, param3, param4, param5, param6) {
    this.entries = param0;
    this.size = param1;
    this.capacity = param2;
    this.capacity_mask = param3;
    this.grow_at = param4;
    this.head = param5;
    this.tail = param6;
  }
  function _M0TPC13set5EntryGsE(param0, param1, param2, param3, param4) {
    this.prev = param0;
    this.next = param1;
    this.psl = param2;
    this.hash = param3;
    this.key = param4;
  }
  function _M0TP310monkeyfist2mf4core7SqBoard(param0, param1, param2, param3, param4, param5, param6, param7, param8) {
    this.n = param0;
    this.left = param1;
    this.occ = param2;
    this.at = param3;
    this.seq = param4;
    this.len = param5;
    this.off = param6;
    this.was = param7;
    this.now = param8;
  }
  function _M0TP310monkeyfist2mf4core10Intentions(param0, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13) {
    this.w = param0;
    this.h = param1;
    this.mirrors = param2;
    this.b = param3;
    this.paths = param4;
    this.stops = param5;
    this.cost = param6;
    this.dep = param7;
    this.cell_at = param8;
    this.rope_at = param9;
    this.cell_by = param10;
    this.done = param11;
    this.taps = param12;
    this.cost_sum = param13;
  }
  function _M0TPB5ArrayGRPB5ArrayGRP310monkeyfist2mf4core2PtEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB5ArrayGRPB5ArrayGiEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB5ArrayGRP310monkeyfist2mf4core4SpotE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core4Spot(param0, param1, param2, param3, param4) {
    this.c = param0;
    this.di = param1;
    this.room = param2;
    this.against = param3;
    this.gap = param4;
  }
  function _M0TPB5ArrayGUiRPC13ref3RefGiEEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core2Pt(param0, param1) {
    this.q = param0;
    this.r = param1;
  }
  function _M0TP310monkeyfist2mf4core5Woven(param0, param1, param2, param3) {
    this.ropes = param0;
    this.taps = param1;
    this.knots = param2;
    this.traps = param3;
  }
  function $f64_convert_i32_u(a) {
    return a < 0 ? a + 4294967296.0 : a + 0.0;
  }
  function _M0TP310monkeyfist2mf4core4Lane(param0, param1, param2) {
    this.cells = param0;
    this.free = param1;
    this.ids = param2;
  }
  function _M0TPB5ArrayGUiRP310monkeyfist2mf4core4LaneiEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core6Shaped(param0, param1, param2) {
    this.cells = param0;
    this.path = param1;
    this.lane = param2;
  }
  function _M0TPB5ArrayGRP310monkeyfist2mf4core6ShapedE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core4Cand(param0, param1, param2, param3, param4, param5, param6) {
    this.path = param0;
    this.lane = param1;
    this.gain = param2;
    this.bends = param3;
    this.pull = param4;
    this.rest = param5;
    this.gap = param6;
  }
  function _M0TPB8MutLocalGRPB5ArrayGiEE(param0) {
    this.val = param0;
  }
  function _M0TPB8MutLocalGRPB5ArrayGRPB5ArrayGiEEE(param0) {
    this.val = param0;
  }
  function _M0TP310monkeyfist2mf4core5Board(param0, param1, param2, param3, param4, param5, param6) {
    this.hex = param0;
    this.w = param1;
    this.h = param2;
    this.ropes = param3;
    this.mirrors = param4;
    this.springs = param5;
    this.plan = param6;
  }
  function _M0TP310monkeyfist2mf4core9SqMirrors(param0, param1) {
    this.slope = param0;
    this.keys = param1;
  }
  function _M0TPB5ArrayGUiiiEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB9ArrayViewGUsbEE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TPB8MutLocalGbE(param0) {
    this.val = param0;
  }
  function _M0TP310monkeyfist2mf4core6Solved(param0, param1, param2) {
    this.solved = param0;
    this.moves = param1;
    this.nodes = param2;
  }
  function _M0TPB9ArrayViewGUsiEE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TP310monkeyfist2mf4core3Par(param0, param1, param2) {
    this.plan = param0;
    this.par = param1;
    this.exact = param2;
  }
  function _M0TP310monkeyfist2mf4core8Replayed(param0, param1, param2, param3) {
    this.solved = param0;
    this.taps = param1;
    this.events = param2;
    this.paths = param3;
  }
  function _M0TP310monkeyfist2mf4core3Rng(param0) {
    this.a = param0;
  }
  function _M0TPB5ArrayGAbE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core4Move(param0, param1, param2, param3) {
    this.paths = param0;
    this.event = param1;
    this.distance = param2;
    this.route = param3;
  }
  function _M0TP310monkeyfist2mf4core3Geo(param0, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10) {
    this.hex = param0;
    this.w = param1;
    this.h = param2;
    this.mirror = param3;
    this.spring = param4;
    this.nmirrors = param5;
    this.nsprings = param6;
    this.occ = param7;
    this.stamp = param8;
    this.tracked = param9;
    this.sqm = param10;
  }
  function _M0TPB5ArrayGUiRP310monkeyfist2mf4core4MoveEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB5ArrayGUiRP310monkeyfist2mf4core4MoveiEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB9ArrayViewGUiiEE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TP310monkeyfist2mf4core8HexBoard(param0, param1, param2, param3, param4, param5, param6, param7, param8) {
    this.w = param0;
    this.n = param1;
    this.tracks = param2;
    this.lengths = param3;
    this.offsets = param4;
    this.occupied = param5;
    this.at = param6;
    this.reach = param7;
    this.left = param8;
  }
  function _M0TPB5ArrayGUiiEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB5ArrayGRPB5ArrayGORPB5ArrayGRP310monkeyfist2mf4core2PtEEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core9HexIntent(param0, param1) {
    this.moves = param0;
    this.cost = param1;
  }
  function _M0TP310monkeyfist2mf4core8HexShape(param0, param1, param2, param3) {
    this.path = param0;
    this.ids = param1;
    this.ray = param2;
    this.turns = param3;
  }
  function _M0TPB5ArrayGUiiiRPB5ArrayGiEEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core8HexBuilt(param0, param1) {
    this.ropes = param0;
    this.plan = param1;
  }
  function _M0TPB5ArrayGRPB5ArrayGRPB5ArrayGRP310monkeyfist2mf4core2PtEEE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core4Core(param0, param1, param2) {
    this.ropes = param0;
    this.stops = param1;
    this.plan = param2;
  }
  function _M0TP310monkeyfist2mf4core6Mirror(param0, param1) {
    this.cell = param0;
    this.kind = param1;
  }
  function _M0TP310monkeyfist2mf4core6HexCfg(param0, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11) {
    this.w = param0;
    this.h = param1;
    this.stage = param2;
    this.coverage = param3;
    this.length = param4;
    this.tap_depth = param5;
    this.mirrors = param6;
    this.knots = param7;
    this.traps = param8;
    this.initial_ropes = param9;
    this.initial_stops = param10;
    this.initial_plan = param11;
  }
  function _M0TP310monkeyfist2mf4core8WeaveCfg(param0, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14) {
    this.w = param0;
    this.h = param1;
    this.len_lo = param2;
    this.len_hi = param3;
    this.min_len = param4;
    this.straight = param5;
    this.cover = param6;
    this.tap_depth = param7;
    this.tie = param8;
    this.bait = param9;
    this.pull = param10;
    this.mirrors = param11;
    this.initial_ropes = param12;
    this.initial_stops = param13;
    this.initial_plan = param14;
  }
  function _M0TPB8MutLocalGRP310monkeyfist2mf4core5BoardE(param0) {
    this.val = param0;
  }
  function _M0TPB9ArrayViewGUibEE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  function _M0TP310monkeyfist2mf4core12FeatureStats(param0, param1, param2, param3) {
    this.used_mirrors = param0;
    this.used_springs = param1;
    this.manual_mirrors = param2;
    this.manual_springs = param3;
  }
  function _M0TPB5ArrayGRP310monkeyfist2mf4core4MoveE(param0, param1) {
    this.buf = param0;
    this.len = param1;
  }
  function _M0TP310monkeyfist2mf4core5Level(param0, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14) {
    this.board = param0;
    this.par = param1;
    this.exact = param2;
    this.coverage = param3;
    this.wins = param4;
    this.challenge = param5;
    this.layout_key = param6;
    this.slides = param7;
    this.bounces = param8;
    this.repeated = param9;
    this.automatic = param10;
    this.used_mirrors = param11;
    this.used_springs = param12;
    this.manual_mirrors = param13;
    this.manual_springs = param14;
  }
  function _M0TPB9ArrayViewGcE(param0, param1, param2) {
    this.buf = param0;
    this.start = param1;
    this.end = param2;
  }
  const _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger = { method_0: _M0IPB13StringBuilderPB6Logger13write__string, method_1: _M0IP016_24default__implPB6Logger16write__substringGRPB13StringBuilderE, method_2: _M0IPB13StringBuilderPB6Logger11write__view, method_3: _M0IPB13StringBuilderPB6Logger11write__char, method_4: _M0IP016_24default__implPB6Logger28write__string__interpolationGRPB13StringBuilderE, method_5: _M0IP016_24default__implPB6Logger5writeGRPB13StringBuilderE };
  const _M0MPB4Iter4nextN6constrS689GRPC16string10StringViewE = 0;
  const _M0MPB4Iter4nextN6constrS690GRPC16string10StringViewE = 0;
  const _M0MPB4Iter4nextN6constrS697GcE = 0;
  const _M0MPB4Iter4nextN6constrS698GcE = 0;
  const _M0MPB4Iter4nextN6constrS705GiE = 0;
  const _M0MPB4Iter4nextN6constrS706GiE = 0;
  const _M0MPB4Iter4nextN6constrS721GbE = 0;
  const _M0MPB4Iter4nextN6constrS722GbE = 0;
  const _M0MPB4Iter3newN6constrS733GRPC16string10StringViewE = 0;
  const _M0MPB4Iter3newN6constrS739GcE = 0;
  const _M0MPB4Iter3newN6constrS745GiE = 0;
  const _M0MPB4Iter3newN6constrS751GbE = 0;
  const _M0FPC16double8infinity = $i64_reinterpret_f64(9218868437227405312n);
  const _M0FPC16double13neg__infinity = $i64_reinterpret_f64(18442240474082181120n);
  const _M0FP310monkeyfist2mf4core6stylesN6recordS2753 = new _M0TP310monkeyfist2mf4core5Style("short", 2, 0.5, 3, false);
  const _M0FP310monkeyfist2mf4core6stylesN6recordS2754 = new _M0TP310monkeyfist2mf4core5Style("medium", 2, 0.35, 4, false);
  const _M0FP310monkeyfist2mf4core6stylesN6recordS2755 = new _M0TP310monkeyfist2mf4core5Style("twisty", 3, 0.2, 6, true);
  const _M0FP310monkeyfist2mf4core6styles = [_M0FP310monkeyfist2mf4core6stylesN6recordS2753, _M0FP310monkeyfist2mf4core6stylesN6recordS2754, _M0FP310monkeyfist2mf4core6stylesN6recordS2755];
  const _M0FP310monkeyfist2mf4core5marks = new _M0TPB5ArrayGiE([], 0);
  const _M0FP310monkeyfist2mf4core11mark__stamp = new _M0TPC13ref3RefGiE(0);
  const _M0FP310monkeyfist2mf4core6sq__dx = [1, 0, -1, 0];
  const _M0FP310monkeyfist2mf4core6sq__dy = [0, 1, 0, -1];
  const _M0FP310monkeyfist2mf4core7hex__dq = [1, 0, -1, -1, 0, 1];
  const _M0FP310monkeyfist2mf4core7hex__dr = [0, 1, 1, 0, -1, -1];
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2756 = new _M0TP310monkeyfist2mf4core4Spec(true, 4, 6, 1, false, false, "1E36ZS5", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2757 = new _M0TP310monkeyfist2mf4core4Spec(false, 4, 5, 1, false, false, "1R69SEE", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2758 = new _M0TP310monkeyfist2mf4core4Spec(true, 4, 6, 10.75, false, false, "FQVGLS", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2759 = new _M0TP310monkeyfist2mf4core4Spec(true, 4, 6, 20.5, false, false, "Q87N7F", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2760 = new _M0TP310monkeyfist2mf4core4Spec(false, 4, 6, 10.75, false, false, "204QXQ", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2761 = new _M0TP310monkeyfist2mf4core4Spec(false, 4, 5, 20.5, false, false, "12Y6W4P", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2762 = new _M0TP310monkeyfist2mf4core4Spec(true, 4, 6, 30.25, false, false, "1PPSC4A", true, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2763 = new _M0TP310monkeyfist2mf4core4Spec(false, 4, 5, 30.25, false, false, "1DFJ2QC", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2764 = new _M0TP310monkeyfist2mf4core4Spec(true, 4, 6, 40, false, false, "XCT8V6", true, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2765 = new _M0TP310monkeyfist2mf4core4Spec(false, 4, 5, 40, false, false, "DF4GA5", true, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2766 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 10, 20, false, false, "16BQGY8", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2767 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 12, 25.831, false, false, "17KH1AO", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2768 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 10, 24.479, true, true, "H4BUD7", false, 2, 1, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2769 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 10, 23.146, false, false, "T1V0O4", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2770 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 11, 20.58, false, true, "5TTLUG", false, 0, 1, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2771 = new _M0TP310monkeyfist2mf4core4Spec(false, 8, 12, 25.153, true, false, "1I1T7WB", false, 1, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2772 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 10, 21.84, false, false, "SVK4N0", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2773 = new _M0TP310monkeyfist2mf4core4Spec(false, 8, 12, 21.202, true, false, "13MVWXM", false, 1, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2774 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 11, 22.489, true, false, "URDUDE", false, 1, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2775 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 10, 23.809, true, false, "IWWEGP", false, 1, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2776 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 9, 28.579, true, false, "1FJ15LH", false, 2, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2777 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 10, 29.97, true, false, "FGM11Z", false, 2, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2778 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 12, 27.199, true, false, "RHTX0R", false, 2, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2779 = new _M0TP310monkeyfist2mf4core4Spec(false, 8, 11, 27.887, true, true, "EOQQ3H", false, 2, 1, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2780 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 13, 32.779, false, true, "GY3JJT", false, 0, 1, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2781 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 9, 29.273, true, true, "15HZGPX", false, 2, 1, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2782 = new _M0TP310monkeyfist2mf4core4Spec(false, 8, 13, 26.513, true, true, "1I36K2N", false, 2, 1, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2783 = new _M0TP310monkeyfist2mf4core4Spec(false, 8, 11, 30.669, false, false, "1TQ2CZM", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2784 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 10, 31.37, false, false, "148O4PM", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2785 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 10, 32.073, false, true, "1ER5UMZ", false, 0, 1, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2786 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 12, 33.486, true, false, "1JVC6AX", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2787 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 10, 34.195, true, false, "1IW0FZL", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2788 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 13, 34.905, true, false, "1X31NDQ", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2789 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 9, 37.763, false, false, "LT88BH", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2790 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 10, 39.921, false, true, "7QGI92", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2791 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 11, 37.046, true, true, "F7C6T", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2792 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 12, 35.617, true, true, "MZCMAO", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2793 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 14, 38.481, true, true, "19MOUFN", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2794 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 10, 36.331, false, true, "19YX5VX", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2795 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 12, 39.2, true, true, "1HK5XN5", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2796 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 11, 43.542, true, false, "Q0QM7X", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2797 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 12, 45.728, true, false, "11ZV02A", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2798 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 10, 44.998, true, true, "10O5PCQ", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2799 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 12, 46.458, true, false, "BOHYPD", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2800 = new _M0TP310monkeyfist2mf4core4Spec(false, 8, 13, 42.09, false, false, "1D2H50H", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2801 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 10, 47.19, true, true, "CNTP0P", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2802 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 11, 40.643, true, true, "10Y03ET", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2803 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 11, 42.816, false, true, "EZF88C", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2804 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 12, 44.27, false, true, "1PBL4JT", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2805 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 10, 41.366, true, true, "9IONA0", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2806 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 15, 49.39, true, false, "1OP7NMU", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2807 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 11, 52.336, true, false, "AY2BIL", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2808 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 12, 47.923, true, false, "22K8YD", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2809 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 10, 50.125, true, true, "1L8PHDI", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2810 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 12, 48.656, true, true, "1Y07GRC", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2811 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 15, 53.814, false, false, "1CKB207", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2812 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 13, 53.075, false, true, "QPQLX", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2813 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 10, 51.598, false, true, "1DK22VE", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2814 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 11, 54.554, true, true, "11SZ9PL", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2815 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 12, 50.862, true, true, "EQVAB3", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2816 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 15, 58.265, true, false, "M1VOGV", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2817 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 13, 60.501, true, true, "JHQ9ZP", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2818 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 14, 56.036, true, false, "1HCGSNF", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2819 = new _M0TP310monkeyfist2mf4core4Spec(false, 8, 16, 55.295, true, false, "9GOL45", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2820 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 12, 57.522, true, true, "87D93U", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2821 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 12, 56.779, true, true, "WKT2LY", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2822 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 16, 61.994, false, false, "84U2RP", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2823 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 16, 59.01, true, true, "1UHN3E3", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2824 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 12, 61.247, false, true, "6BJJDG", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2825 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 12, 59.755, false, true, "1HOJWGT", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2826 = new _M0TP310monkeyfist2mf4core4Spec(false, 8, 15, 67.24, true, true, "ORV5CK", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2827 = new _M0TP310monkeyfist2mf4core4Spec(true, 8, 15, 63.49, true, false, "1OLYVRN", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2828 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 14, 65.738, true, false, "1AYWVRG", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2829 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 13, 62.742, false, false, "C6M35", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2830 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 12, 67.992, false, true, "E2XBR7", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2831 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 14, 64.239, true, true, "CGNNOT", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2832 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 16, 64.988, true, false, "2BP1HE", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2833 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 11, 68.745, false, true, "P5JGPE", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2834 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 13, 69.498, true, true, "1MNW6SU", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2835 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 16, 66.489, true, true, "AKTXYF", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2836 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 13, 71.005, true, false, "1FL70XF", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2837 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 13, 70.251, true, false, "FQDB7L", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2838 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 14, 75.54, true, true, "14NSC3N", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2839 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 12, 73.27, true, true, "1R06Q9U", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2840 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 16, 77.056, false, false, "RLSZE3", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2841 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 14, 74.783, true, true, "13W28S1", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2842 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 12, 74.026, true, true, "1U1OT6", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2843 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 12, 72.515, true, false, "T3FPIT", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2844 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 12, 76.298, false, true, "HYFLVD", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2845 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 15, 71.76, false, true, "1RGH7ZX", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2846 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 15, 78.574, false, true, "LLUC5A", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2847 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 13, 80.853, true, false, "ZVZHJF", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2848 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 15, 81.614, false, true, "1TNK21", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2849 = new _M0TP310monkeyfist2mf4core4Spec(true, 12, 13, 83.137, true, false, "1BV3VDS", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2850 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 14, 84.662, true, false, "OGZS70", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2851 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 13, 82.376, false, false, "1ATE6D7", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2852 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 12, 77.814, true, true, "1BD8649", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2853 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 12, 83.9, true, true, "O1N99M", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2854 = new _M0TP310monkeyfist2mf4core4Spec(false, 10, 13, 79.333, true, true, "1PFMFKQ", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2855 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 13, 80.093, true, true, "Q8M40P", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2856 = new _M0TP310monkeyfist2mf4core4Spec(false, 9, 16, 86.953, true, false, "914VI0", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2857 = new _M0TP310monkeyfist2mf4core4Spec(true, 12, 13, 86.189, true, true, "1VJ5C8T", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2858 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 13, 87.717, true, false, "ZMHIJW", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2859 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 16, 90.013, false, true, "XCEPST", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2860 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 16, 90.779, true, false, "1MJTCDU", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2861 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 14, 85.425, false, true, "1WIH2K5", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2862 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 15, 88.482, false, false, "1JK6FIG", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2863 = new _M0TP310monkeyfist2mf4core4Spec(true, 9, 16, 92.312, true, true, "JTM74C", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2864 = new _M0TP310monkeyfist2mf4core4Spec(true, 12, 14, 89.247, true, true, "AUFEW9", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2865 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 15, 91.545, true, true, "1U7ATWD", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2866 = new _M0TP310monkeyfist2mf4core4Spec(true, 12, 12, 93.846, false, true, "1UJKWAL", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2867 = new _M0TP310monkeyfist2mf4core4Spec(false, 11, 16, 96.151, false, true, "XL25Y7", false, 0, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2868 = new _M0TP310monkeyfist2mf4core4Spec(true, 10, 15, 96.92, true, false, "79P4LA", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2869 = new _M0TP310monkeyfist2mf4core4Spec(true, 11, 16, 98.459, false, false, "UGXK33", false, 0, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2870 = new _M0TP310monkeyfist2mf4core4Spec(true, 12, 14, 100, true, true, "HQ3CE8", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2871 = new _M0TP310monkeyfist2mf4core4Spec(true, 12, 14, 95.383, true, false, "IWKXI9", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2872 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 13, 93.079, true, true, "KPVGWI", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2873 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 13, 99.23, true, false, "H0R7RV", false, 3, 0, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2874 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 14, 97.69, true, true, "1RTSDHA", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journeyN6recordS2875 = new _M0TP310monkeyfist2mf4core4Spec(false, 12, 14, 94.614, true, true, "197XYV6", false, 3, 2, false);
  const _M0FP310monkeyfist2mf4core7journey = [_M0FP310monkeyfist2mf4core7journeyN6recordS2756, _M0FP310monkeyfist2mf4core7journeyN6recordS2757, _M0FP310monkeyfist2mf4core7journeyN6recordS2758, _M0FP310monkeyfist2mf4core7journeyN6recordS2759, _M0FP310monkeyfist2mf4core7journeyN6recordS2760, _M0FP310monkeyfist2mf4core7journeyN6recordS2761, _M0FP310monkeyfist2mf4core7journeyN6recordS2762, _M0FP310monkeyfist2mf4core7journeyN6recordS2763, _M0FP310monkeyfist2mf4core7journeyN6recordS2764, _M0FP310monkeyfist2mf4core7journeyN6recordS2765, _M0FP310monkeyfist2mf4core7journeyN6recordS2766, _M0FP310monkeyfist2mf4core7journeyN6recordS2767, _M0FP310monkeyfist2mf4core7journeyN6recordS2768, _M0FP310monkeyfist2mf4core7journeyN6recordS2769, _M0FP310monkeyfist2mf4core7journeyN6recordS2770, _M0FP310monkeyfist2mf4core7journeyN6recordS2771, _M0FP310monkeyfist2mf4core7journeyN6recordS2772, _M0FP310monkeyfist2mf4core7journeyN6recordS2773, _M0FP310monkeyfist2mf4core7journeyN6recordS2774, _M0FP310monkeyfist2mf4core7journeyN6recordS2775, _M0FP310monkeyfist2mf4core7journeyN6recordS2776, _M0FP310monkeyfist2mf4core7journeyN6recordS2777, _M0FP310monkeyfist2mf4core7journeyN6recordS2778, _M0FP310monkeyfist2mf4core7journeyN6recordS2779, _M0FP310monkeyfist2mf4core7journeyN6recordS2780, _M0FP310monkeyfist2mf4core7journeyN6recordS2781, _M0FP310monkeyfist2mf4core7journeyN6recordS2782, _M0FP310monkeyfist2mf4core7journeyN6recordS2783, _M0FP310monkeyfist2mf4core7journeyN6recordS2784, _M0FP310monkeyfist2mf4core7journeyN6recordS2785, _M0FP310monkeyfist2mf4core7journeyN6recordS2786, _M0FP310monkeyfist2mf4core7journeyN6recordS2787, _M0FP310monkeyfist2mf4core7journeyN6recordS2788, _M0FP310monkeyfist2mf4core7journeyN6recordS2789, _M0FP310monkeyfist2mf4core7journeyN6recordS2790, _M0FP310monkeyfist2mf4core7journeyN6recordS2791, _M0FP310monkeyfist2mf4core7journeyN6recordS2792, _M0FP310monkeyfist2mf4core7journeyN6recordS2793, _M0FP310monkeyfist2mf4core7journeyN6recordS2794, _M0FP310monkeyfist2mf4core7journeyN6recordS2795, _M0FP310monkeyfist2mf4core7journeyN6recordS2796, _M0FP310monkeyfist2mf4core7journeyN6recordS2797, _M0FP310monkeyfist2mf4core7journeyN6recordS2798, _M0FP310monkeyfist2mf4core7journeyN6recordS2799, _M0FP310monkeyfist2mf4core7journeyN6recordS2800, _M0FP310monkeyfist2mf4core7journeyN6recordS2801, _M0FP310monkeyfist2mf4core7journeyN6recordS2802, _M0FP310monkeyfist2mf4core7journeyN6recordS2803, _M0FP310monkeyfist2mf4core7journeyN6recordS2804, _M0FP310monkeyfist2mf4core7journeyN6recordS2805, _M0FP310monkeyfist2mf4core7journeyN6recordS2806, _M0FP310monkeyfist2mf4core7journeyN6recordS2807, _M0FP310monkeyfist2mf4core7journeyN6recordS2808, _M0FP310monkeyfist2mf4core7journeyN6recordS2809, _M0FP310monkeyfist2mf4core7journeyN6recordS2810, _M0FP310monkeyfist2mf4core7journeyN6recordS2811, _M0FP310monkeyfist2mf4core7journeyN6recordS2812, _M0FP310monkeyfist2mf4core7journeyN6recordS2813, _M0FP310monkeyfist2mf4core7journeyN6recordS2814, _M0FP310monkeyfist2mf4core7journeyN6recordS2815, _M0FP310monkeyfist2mf4core7journeyN6recordS2816, _M0FP310monkeyfist2mf4core7journeyN6recordS2817, _M0FP310monkeyfist2mf4core7journeyN6recordS2818, _M0FP310monkeyfist2mf4core7journeyN6recordS2819, _M0FP310monkeyfist2mf4core7journeyN6recordS2820, _M0FP310monkeyfist2mf4core7journeyN6recordS2821, _M0FP310monkeyfist2mf4core7journeyN6recordS2822, _M0FP310monkeyfist2mf4core7journeyN6recordS2823, _M0FP310monkeyfist2mf4core7journeyN6recordS2824, _M0FP310monkeyfist2mf4core7journeyN6recordS2825, _M0FP310monkeyfist2mf4core7journeyN6recordS2826, _M0FP310monkeyfist2mf4core7journeyN6recordS2827, _M0FP310monkeyfist2mf4core7journeyN6recordS2828, _M0FP310monkeyfist2mf4core7journeyN6recordS2829, _M0FP310monkeyfist2mf4core7journeyN6recordS2830, _M0FP310monkeyfist2mf4core7journeyN6recordS2831, _M0FP310monkeyfist2mf4core7journeyN6recordS2832, _M0FP310monkeyfist2mf4core7journeyN6recordS2833, _M0FP310monkeyfist2mf4core7journeyN6recordS2834, _M0FP310monkeyfist2mf4core7journeyN6recordS2835, _M0FP310monkeyfist2mf4core7journeyN6recordS2836, _M0FP310monkeyfist2mf4core7journeyN6recordS2837, _M0FP310monkeyfist2mf4core7journeyN6recordS2838, _M0FP310monkeyfist2mf4core7journeyN6recordS2839, _M0FP310monkeyfist2mf4core7journeyN6recordS2840, _M0FP310monkeyfist2mf4core7journeyN6recordS2841, _M0FP310monkeyfist2mf4core7journeyN6recordS2842, _M0FP310monkeyfist2mf4core7journeyN6recordS2843, _M0FP310monkeyfist2mf4core7journeyN6recordS2844, _M0FP310monkeyfist2mf4core7journeyN6recordS2845, _M0FP310monkeyfist2mf4core7journeyN6recordS2846, _M0FP310monkeyfist2mf4core7journeyN6recordS2847, _M0FP310monkeyfist2mf4core7journeyN6recordS2848, _M0FP310monkeyfist2mf4core7journeyN6recordS2849, _M0FP310monkeyfist2mf4core7journeyN6recordS2850, _M0FP310monkeyfist2mf4core7journeyN6recordS2851, _M0FP310monkeyfist2mf4core7journeyN6recordS2852, _M0FP310monkeyfist2mf4core7journeyN6recordS2853, _M0FP310monkeyfist2mf4core7journeyN6recordS2854, _M0FP310monkeyfist2mf4core7journeyN6recordS2855, _M0FP310monkeyfist2mf4core7journeyN6recordS2856, _M0FP310monkeyfist2mf4core7journeyN6recordS2857, _M0FP310monkeyfist2mf4core7journeyN6recordS2858, _M0FP310monkeyfist2mf4core7journeyN6recordS2859, _M0FP310monkeyfist2mf4core7journeyN6recordS2860, _M0FP310monkeyfist2mf4core7journeyN6recordS2861, _M0FP310monkeyfist2mf4core7journeyN6recordS2862, _M0FP310monkeyfist2mf4core7journeyN6recordS2863, _M0FP310monkeyfist2mf4core7journeyN6recordS2864, _M0FP310monkeyfist2mf4core7journeyN6recordS2865, _M0FP310monkeyfist2mf4core7journeyN6recordS2866, _M0FP310monkeyfist2mf4core7journeyN6recordS2867, _M0FP310monkeyfist2mf4core7journeyN6recordS2868, _M0FP310monkeyfist2mf4core7journeyN6recordS2869, _M0FP310monkeyfist2mf4core7journeyN6recordS2870, _M0FP310monkeyfist2mf4core7journeyN6recordS2871, _M0FP310monkeyfist2mf4core7journeyN6recordS2872, _M0FP310monkeyfist2mf4core7journeyN6recordS2873, _M0FP310monkeyfist2mf4core7journeyN6recordS2874, _M0FP310monkeyfist2mf4core7journeyN6recordS2875];
  const _M0FP310monkeyfist2mf4core13journey__opts = new _M0TP310monkeyfist2mf4core7SetOpts(true, 77, 1, 100, 10, 14, 120, true, true, false, "MONKEYFIST");
  const _M0FP310monkeyfist2mf3gen5input = new _M0TPB5ArrayGiE([], 0);
  const _M0FP310monkeyfist2mf3gen6output = new _M0TPB5ArrayGiE([], 0);
  const _M0FP310monkeyfist2mf3gen9output__f = new _M0TPB5ArrayGdE([], 0);
  const _M0FP310monkeyfist2mf3gen7current = new _M0TPC13ref3RefGORP310monkeyfist2mf4core5LevelE(undefined);
  const _M0FPB4seed = _M0FPB12random__seed();
  const _M0FP310monkeyfist2mf4core9sq__solveN6constrS3905 = true;
  const _M0FP310monkeyfist2mf4core9sq__solveN6constrS3906 = false;
  const _M0FP310monkeyfist2mf4core10hex__solveN6constrS4775 = true;
  const _M0FP310monkeyfist2mf4core10hex__solveN6constrS4776 = false;
  const _M0MP310monkeyfist2mf4core3Geo11solve__fullN6constrS4507 = true;
  const _M0MP310monkeyfist2mf4core3Geo11solve__fullN6constrS4508 = false;
  const _M0MP310monkeyfist2mf4core3Geo11solve__fullN6constrS4509 = true;
  const _M0MP310monkeyfist2mf4core3Geo11solve__fullN6constrS4510 = false;
  const _M0FP310monkeyfist2mf4core14repeated__coreN6constrS5431 = true;
  const _M0FP310monkeyfist2mf4core8snapshotN6recordS4171 = new _M0TP310monkeyfist2mf4core4Snap(2, 0, -1);
  const _M0FP310monkeyfist2mf4core8snapshotN6constrS4172 = _M0FP310monkeyfist2mf4core8snapshotN6recordS4171;
  const _M0FP310monkeyfist2mf4core8snapshotN6recordS4173 = new _M0TP310monkeyfist2mf4core4Snap(2, 0, -1);
  const _M0FP310monkeyfist2mf4core8snapshotN6constrS4174 = _M0FP310monkeyfist2mf4core8snapshotN6recordS4173;
  const _M0FP310monkeyfist2mf4core15search__spinnerN6constrS5651 = true;
  const _M0MPC16string6String4trimN6recordS1343 = new _M0TPC16string10StringView("\t\n\r ", 0, 4);
  const _M0MPC16string10StringView4findN6constrS903 = 0;
  const _M0FP310monkeyfist2mf4core11parse__codeN6constrS6056 = _M0FP310monkeyfist2mf4core13journey__opts;
  const _M0FP310monkeyfist2mf4core11parse__codeN6recordS6057 = new _M0TPC16string10StringView("-", 0, 1);
  const _M0FP310monkeyfist2mf4core11parse__codeN6recordS6058 = new _M0TPC16string10StringView("M", 0, 1);
  const _M0FP310monkeyfist2mf4core11parse__codeN6recordS6059 = new _M0TPC16string10StringView("S", 0, 1);
  const _M0FP310monkeyfist2mf4core11parse__codeN6recordS6060 = new _M0TPC16string10StringView("C", 0, 1);
  const _M0FP310monkeyfist2mf4core5guideN6constrS6135 = true;
  const _M0FP310monkeyfist2mf4core19reachable__featuresN6recordS6154 = new _M0TPC16string10StringView(";", 0, 1);
  function _M0MPC16string10StringView12unsafe__view(self, start, end) {
    return new _M0TPC16string10StringView(self.str, self.start + start | 0, self.start + end | 0);
  }
  function _M0FPB13consume4__acc(acc, input) {
    const _p = (acc >>> 0) + ((Math.imul(input, -1028477379) | 0) >>> 0) | 0;
    return Math.imul(_p << 17 | (_p >>> 15 | 0), 668265263) | 0;
  }
  function _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGUiRPC13ref3RefGiEEEE(dst, dst_offset, src, src_offset, len) {
    if (dst === src && dst_offset < src_offset) {
      let _tmp = 0;
      while (true) {
        const i = _tmp;
        if (i < len) {
          const _tmp$2 = dst_offset + i | 0;
          const _tmp$3 = src_offset + i | 0;
          if (_tmp$2 >>> 0 < dst.length) {
            dst[_tmp$2] = _tmp$3 >>> 0 < src.length ? src[_tmp$3] : $oob();
          } else {
            $oob();
          }
          _tmp = i + 1 | 0;
          continue;
        } else {
          return;
        }
      }
    } else {
      let _tmp = len - 1 | 0;
      let _tmp$2 = len > 0;
      while (true) {
        const i = _tmp;
        const _more = _tmp$2;
        if (_more) {
          const _tmp$3 = dst_offset + i | 0;
          const _tmp$4 = src_offset + i | 0;
          if (_tmp$3 >>> 0 < dst.length) {
            dst[_tmp$3] = _tmp$4 >>> 0 < src.length ? src[_tmp$4] : $oob();
          } else {
            $oob();
          }
          _tmp = i - 1 | 0;
          _tmp$2 = i > 0;
          continue;
        } else {
          return;
        }
      }
    }
  }
  function _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGiEE(dst, dst_offset, src, src_offset, len) {
    if (dst === src && dst_offset < src_offset) {
      let _tmp = 0;
      while (true) {
        const i = _tmp;
        if (i < len) {
          const _tmp$2 = dst_offset + i | 0;
          const _tmp$3 = src_offset + i | 0;
          if (_tmp$2 >>> 0 < dst.length) {
            dst[_tmp$2] = _tmp$3 >>> 0 < src.length ? src[_tmp$3] : $oob();
          } else {
            $oob();
          }
          _tmp = i + 1 | 0;
          continue;
        } else {
          return;
        }
      }
    } else {
      let _tmp = len - 1 | 0;
      let _tmp$2 = len > 0;
      while (true) {
        const i = _tmp;
        const _more = _tmp$2;
        if (_more) {
          const _tmp$3 = dst_offset + i | 0;
          const _tmp$4 = src_offset + i | 0;
          if (_tmp$3 >>> 0 < dst.length) {
            dst[_tmp$3] = _tmp$4 >>> 0 < src.length ? src[_tmp$4] : $oob();
          } else {
            $oob();
          }
          _tmp = i - 1 | 0;
          _tmp$2 = i > 0;
          continue;
        } else {
          return;
        }
      }
    }
  }
  function _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGdEE(dst, dst_offset, src, src_offset, len) {
    if (dst === src && dst_offset < src_offset) {
      let _tmp = 0;
      while (true) {
        const i = _tmp;
        if (i < len) {
          const _tmp$2 = dst_offset + i | 0;
          const _tmp$3 = src_offset + i | 0;
          if (_tmp$2 >>> 0 < dst.length) {
            dst[_tmp$2] = _tmp$3 >>> 0 < src.length ? src[_tmp$3] : $oob();
          } else {
            $oob();
          }
          _tmp = i + 1 | 0;
          continue;
        } else {
          return;
        }
      }
    } else {
      let _tmp = len - 1 | 0;
      let _tmp$2 = len > 0;
      while (true) {
        const i = _tmp;
        const _more = _tmp$2;
        if (_more) {
          const _tmp$3 = dst_offset + i | 0;
          const _tmp$4 = src_offset + i | 0;
          if (_tmp$3 >>> 0 < dst.length) {
            dst[_tmp$3] = _tmp$4 >>> 0 < src.length ? src[_tmp$4] : $oob();
          } else {
            $oob();
          }
          _tmp = i - 1 | 0;
          _tmp$2 = i > 0;
          continue;
        } else {
          return;
        }
      }
    }
  }
  function _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGORPB5ArrayGRP310monkeyfist2mf4core2PtEEE(dst, dst_offset, src, src_offset, len) {
    if (dst === src && dst_offset < src_offset) {
      let _tmp = 0;
      while (true) {
        const i = _tmp;
        if (i < len) {
          const _tmp$2 = dst_offset + i | 0;
          const _tmp$3 = src_offset + i | 0;
          if (_tmp$2 >>> 0 < dst.length) {
            dst[_tmp$2] = _tmp$3 >>> 0 < src.length ? src[_tmp$3] : $oob();
          } else {
            $oob();
          }
          _tmp = i + 1 | 0;
          continue;
        } else {
          return;
        }
      }
    } else {
      let _tmp = len - 1 | 0;
      let _tmp$2 = len > 0;
      while (true) {
        const i = _tmp;
        const _more = _tmp$2;
        if (_more) {
          const _tmp$3 = dst_offset + i | 0;
          const _tmp$4 = src_offset + i | 0;
          if (_tmp$3 >>> 0 < dst.length) {
            dst[_tmp$3] = _tmp$4 >>> 0 < src.length ? src[_tmp$4] : $oob();
          } else {
            $oob();
          }
          _tmp = i - 1 | 0;
          _tmp$2 = i > 0;
          continue;
        } else {
          return;
        }
      }
    }
  }
  function _M0MPB18UninitializedArray12unsafe__blitGUiiiRPB5ArrayGiEEE(dst, dst_offset, src, src_offset, len) {
    _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGUiRPC13ref3RefGiEEEE(dst, dst_offset, src, src_offset, len);
  }
  function _M0MPB18UninitializedArray12unsafe__blitGiE(dst, dst_offset, src, src_offset, len) {
    _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGiEE(dst, dst_offset, src, src_offset, len);
  }
  function _M0MPB18UninitializedArray12unsafe__blitGdE(dst, dst_offset, src, src_offset, len) {
    _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGdEE(dst, dst_offset, src, src_offset, len);
  }
  function _M0MPB18UninitializedArray23unsafe__make__and__blitGUiiiRPB5ArrayGiEEE(src, allocate_len, src_offset, dst_offset, blit_len) {
    const dst = new Array(allocate_len);
    _M0MPB18UninitializedArray12unsafe__blitGUiiiRPB5ArrayGiEEE(dst, dst_offset, src, src_offset, blit_len);
    return dst;
  }
  function _M0MPB18UninitializedArray23unsafe__make__and__blitGiE(src, allocate_len, src_offset, dst_offset, blit_len) {
    const dst = new Array(allocate_len);
    _M0MPB18UninitializedArray12unsafe__blitGiE(dst, dst_offset, src, src_offset, blit_len);
    return dst;
  }
  function _M0MPB18UninitializedArray23unsafe__make__and__blitGdE(src, allocate_len, src_offset, dst_offset, blit_len) {
    const dst = new Array(allocate_len);
    _M0MPB18UninitializedArray12unsafe__blitGdE(dst, dst_offset, src, src_offset, blit_len);
    return dst;
  }
  function _M0MPB13StringBuilder13write__objectGcE(self, obj) {
    _M0IP016_24default__implPB4Show6outputGcE(obj, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
  }
  function _M0MPB13StringBuilder13write__objectGsE(self, obj) {
    _M0IP016_24default__implPB4Show6outputGsE(obj, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
  }
  function _M0MPB13StringBuilder13write__objectGiE(self, obj) {
    _M0IP016_24default__implPB4Show6outputGiE(obj, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
  }
  function _M0MPB18UninitializedArray23make__and__blit_2einnerGUiiiRPB5ArrayGiEEE(src, allocate_len, len, src_offset, dst_offset) {
    let _tmp;
    if (allocate_len >= 0) {
      let _tmp$2;
      if (len >= 0) {
        let _tmp$3;
        const _p = src.length;
        if (src_offset >= 0 && src_offset <= (_p - len | 0)) {
          _tmp$3 = dst_offset >= 0 && dst_offset <= (allocate_len - len | 0);
        } else {
          _tmp$3 = false;
        }
        _tmp$2 = _tmp$3;
      } else {
        _tmp$2 = false;
      }
      _tmp = _tmp$2;
    } else {
      _tmp = false;
    }
    if (_tmp) {
      return _M0MPB18UninitializedArray23unsafe__make__and__blitGUiiiRPB5ArrayGiEEE(src, allocate_len, src_offset, dst_offset, len);
    } else {
      const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(89);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "bounds check failed: allocate_len = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, allocate_len);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", src_offset = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, src_offset);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", dst_offset = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, dst_offset);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", len = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, len);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", src.length = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, src.length);
      return $panic(_string_builder.val);
    }
  }
  function _M0MPB18UninitializedArray23make__and__blit_2einnerGiE(src, allocate_len, len, src_offset, dst_offset) {
    let _tmp;
    if (allocate_len >= 0) {
      let _tmp$2;
      if (len >= 0) {
        let _tmp$3;
        const _p = src.length;
        if (src_offset >= 0 && src_offset <= (_p - len | 0)) {
          _tmp$3 = dst_offset >= 0 && dst_offset <= (allocate_len - len | 0);
        } else {
          _tmp$3 = false;
        }
        _tmp$2 = _tmp$3;
      } else {
        _tmp$2 = false;
      }
      _tmp = _tmp$2;
    } else {
      _tmp = false;
    }
    if (_tmp) {
      return _M0MPB18UninitializedArray23unsafe__make__and__blitGiE(src, allocate_len, src_offset, dst_offset, len);
    } else {
      const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(89);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "bounds check failed: allocate_len = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, allocate_len);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", src_offset = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, src_offset);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", dst_offset = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, dst_offset);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", len = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, len);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", src.length = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, src.length);
      return $panic(_string_builder.val);
    }
  }
  function _M0MPB18UninitializedArray23make__and__blit_2einnerGdE(src, allocate_len, len, src_offset, dst_offset) {
    let _tmp;
    if (allocate_len >= 0) {
      let _tmp$2;
      if (len >= 0) {
        let _tmp$3;
        const _p = src.length;
        if (src_offset >= 0 && src_offset <= (_p - len | 0)) {
          _tmp$3 = dst_offset >= 0 && dst_offset <= (allocate_len - len | 0);
        } else {
          _tmp$3 = false;
        }
        _tmp$2 = _tmp$3;
      } else {
        _tmp$2 = false;
      }
      _tmp = _tmp$2;
    } else {
      _tmp = false;
    }
    if (_tmp) {
      return _M0MPB18UninitializedArray23unsafe__make__and__blitGdE(src, allocate_len, src_offset, dst_offset, len);
    } else {
      const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(89);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "bounds check failed: allocate_len = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, allocate_len);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", src_offset = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, src_offset);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", dst_offset = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, dst_offset);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", len = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, len);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ", src.length = ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, src.length);
      return $panic(_string_builder.val);
    }
  }
  function _M0MPB13StringBuilder21StringBuilder_2einner(size_hint) {
    return size_hint >= 0 ? new _M0TPB13StringBuilder("") : $panic("size_hint must be non-negative");
  }
  function _M0IPB13StringBuilderPB6Logger11write__char(self, ch) {
    self.val = `${self.val}${String.fromCodePoint(ch)}`;
  }
  function _M0IPB13StringBuilderPB6Logger13write__string(self, str) {
    self.val = `${self.val}${str}`;
  }
  function _M0FPB32code__point__of__surrogate__pair(leading, trailing) {
    return (((Math.imul(leading - 55296 | 0, 1024) | 0) + trailing | 0) - 56320 | 0) + 65536 | 0;
  }
  function _M0MPC16string6String16unsafe__char__at(self, index) {
    const c1 = self.charCodeAt(index);
    if (c1 >= 55296 && c1 <= 56319) {
      const c2 = self.charCodeAt(index + 1 | 0);
      return _M0FPB32code__point__of__surrogate__pair(c1, c2);
    } else {
      return c1;
    }
  }
  function _M0IP016_24default__implPB2Eq10not__equalGObE(x, y) {
    return !_M0IPC16option6OptionPB2Eq5equalGbE(x, y);
  }
  function _M0FPB14avalanche__acc(acc) {
    let acc$2 = acc;
    acc$2 = acc$2 ^ (acc$2 >>> 15 | 0);
    acc$2 = Math.imul(acc$2, -2048144777) | 0;
    acc$2 = acc$2 ^ (acc$2 >>> 13 | 0);
    acc$2 = Math.imul(acc$2, -1028477379) | 0;
    acc$2 = acc$2 ^ (acc$2 >>> 16 | 0);
    return acc$2;
  }
  function _M0FPB13finalize__acc(acc) {
    return _M0FPB14avalanche__acc(acc);
  }
  function _M0IP016_24default__implPB6Logger28write__string__interpolationGRPB13StringBuilderE(self, show) {
    show.method_table.method_0(show.self, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
  }
  function _M0IP016_24default__implPB6Logger5writeGRPB13StringBuilderE(self, show) {
    show.method_table.method_0(show.self, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
  }
  function _M0MPC16string6String21clamped__view_2einner(self, start, end) {
    const len = self.length;
    let lo;
    if (start <= 0) {
      lo = 0;
    } else {
      if (start >= len) {
        lo = len;
      } else {
        let _tmp;
        const _p = self.charCodeAt(start);
        if (_p >= 56320 && _p <= 57343) {
          const _p$2 = self.charCodeAt(start - 1 | 0);
          _tmp = _p$2 >= 55296 && _p$2 <= 56319;
        } else {
          _tmp = false;
        }
        if (_tmp) {
          lo = start + 1 | 0;
        } else {
          lo = start;
        }
      }
    }
    let hi;
    if (end === undefined) {
      hi = len;
    } else {
      const _Some = end;
      const _e = _Some;
      if (_e <= 0) {
        hi = 0;
      } else {
        if (_e >= len) {
          hi = len;
        } else {
          let _tmp;
          const _p = self.charCodeAt(_e);
          if (_p >= 56320 && _p <= 57343) {
            const _p$2 = self.charCodeAt(_e - 1 | 0);
            _tmp = _p$2 >= 55296 && _p$2 <= 56319;
          } else {
            _tmp = false;
          }
          if (_tmp) {
            hi = _e - 1 | 0;
          } else {
            hi = _e;
          }
        }
      }
    }
    return lo >= hi ? new _M0TPC16string10StringView(self, lo, lo) : new _M0TPC16string10StringView(self, lo, hi);
  }
  function _M0IP016_24default__implPB6Logger16write__substringGRPB13StringBuilderE(self, value, start, len) {
    _M0IPB13StringBuilderPB6Logger11write__view(self, _M0MPC16string6String21clamped__view_2einner(value, start, start + len | 0));
  }
  function _M0IP016_24default__implPB4Show6outputGcE(self, logger) {
    logger.method_table.method_0(logger.self, _M0IPC14char4CharPB4Show10to__string(self));
  }
  function _M0IP016_24default__implPB4Show6outputGsE(self, logger) {
    logger.method_table.method_0(logger.self, self);
  }
  function _M0IP016_24default__implPB4Show6outputGiE(self, logger) {
    logger.method_table.method_0(logger.self, _M0IPC13int3IntPB4Show10to__string(self));
  }
  function _M0MPB4Iter4nextGRPC16string10StringViewE(self) {
    const _func = self.f;
    const result = _func();
    const _bind = self.size_hint;
    if (result === undefined) {
      self.size_hint = _M0MPB4Iter4nextN6constrS690GRPC16string10StringViewE;
    } else {
      if (_bind === undefined) {
      } else {
        const _Some = _bind;
        const _n = _Some;
        self.size_hint = _n > 0 ? _n - 1 | 0 : _M0MPB4Iter4nextN6constrS689GRPC16string10StringViewE;
      }
    }
    return result;
  }
  function _M0MPB4Iter4nextGcE(self) {
    const _func = self.f;
    const result = _func();
    const _bind = self.size_hint;
    if (result === -1) {
      self.size_hint = _M0MPB4Iter4nextN6constrS698GcE;
    } else {
      if (_bind === undefined) {
      } else {
        const _Some = _bind;
        const _n = _Some;
        self.size_hint = _n > 0 ? _n - 1 | 0 : _M0MPB4Iter4nextN6constrS697GcE;
      }
    }
    return result;
  }
  function _M0MPB4Iter4nextGiE(self) {
    const _func = self.f;
    const result = _func();
    const _bind = self.size_hint;
    if (result === undefined) {
      self.size_hint = _M0MPB4Iter4nextN6constrS706GiE;
    } else {
      if (_bind === undefined) {
      } else {
        const _Some = _bind;
        const _n = _Some;
        self.size_hint = _n > 0 ? _n - 1 | 0 : _M0MPB4Iter4nextN6constrS705GiE;
      }
    }
    return result;
  }
  function _M0MPB4Iter4nextGbE(self) {
    const _func = self.f;
    const result = _func();
    const _bind = self.size_hint;
    if (result === -1) {
      self.size_hint = _M0MPB4Iter4nextN6constrS722GbE;
    } else {
      if (_bind === undefined) {
      } else {
        const _Some = _bind;
        const _n = _Some;
        self.size_hint = _n > 0 ? _n - 1 | 0 : _M0MPB4Iter4nextN6constrS721GbE;
      }
    }
    return result;
  }
  function _M0MPC13int3Int18to__string_2einner(self, radix) {
    return _M0FPB19int__to__string__js(self, radix);
  }
  function _M0MPC14uint4UInt18to__string_2einner(self, radix) {
    return _M0FPB20uint__to__string__js(self, radix);
  }
  function _M0MPB4Iter3newGRPC16string10StringViewE(f, size_hint) {
    let size_hint$2;
    if (size_hint === undefined) {
      size_hint$2 = undefined;
    } else {
      const _Some = size_hint;
      const _n = _Some;
      size_hint$2 = _n > 0 ? _n : _M0MPB4Iter3newN6constrS733GRPC16string10StringViewE;
    }
    return new _M0TPB4IterGRPC16string10StringViewE(f, size_hint$2);
  }
  function _M0MPB4Iter3newGcE(f, size_hint) {
    let size_hint$2;
    if (size_hint === undefined) {
      size_hint$2 = undefined;
    } else {
      const _Some = size_hint;
      const _n = _Some;
      size_hint$2 = _n > 0 ? _n : _M0MPB4Iter3newN6constrS739GcE;
    }
    return new _M0TPB4IterGcE(f, size_hint$2);
  }
  function _M0MPB4Iter3newGiE(f, size_hint) {
    let size_hint$2;
    if (size_hint === undefined) {
      size_hint$2 = undefined;
    } else {
      const _Some = size_hint;
      const _n = _Some;
      size_hint$2 = _n > 0 ? _n : _M0MPB4Iter3newN6constrS745GiE;
    }
    return new _M0TPB4IterGiE(f, size_hint$2);
  }
  function _M0MPB4Iter3newGbE(f, size_hint) {
    let size_hint$2;
    if (size_hint === undefined) {
      size_hint$2 = undefined;
    } else {
      const _Some = size_hint;
      const _n = _Some;
      size_hint$2 = _n > 0 ? _n : _M0MPB4Iter3newN6constrS751GbE;
    }
    return new _M0TPB4IterGbE(f, size_hint$2);
  }
  function _M0MPC15array10FixedArray5makeiGiE(length, value) {
    if (length <= 0) {
      return [];
    } else {
      const array = $make_array_len_and_init(length, value(0));
      let _tmp = 1;
      while (true) {
        const i = _tmp;
        if (i < length) {
          if (i >>> 0 < array.length) {
            array[i] = value(i);
          } else {
            $oob();
          }
          _tmp = i + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      return array;
    }
  }
  function _M0MPC16string10StringView9to__owned(self) {
    return self.str.substring(self.start, self.end);
  }
  function _M0MPC16string10StringView4iter(self) {
    const start = self.start;
    const end = self.end;
    const index = new _M0TPB8MutLocalGiE(start);
    return _M0MPB4Iter3newGcE(() => {
      if (index.val < end) {
        const c1 = self.str.charCodeAt(index.val);
        if (c1 >= 55296 && c1 <= 56319 && (index.val + 1 | 0) < self.end) {
          const c2 = self.str.charCodeAt(index.val + 1 | 0);
          if (c2 >= 56320 && c2 <= 57343) {
            index.val = index.val + 2 | 0;
            return _M0FPB32code__point__of__surrogate__pair(c1, c2);
          }
        }
        index.val = index.val + 1 | 0;
        return c1;
      } else {
        return -1;
      }
    }, undefined);
  }
  function _M0MPC16string6String11from__array(chars) {
    const buf = _M0MPB13StringBuilder21StringBuilder_2einner(Math.imul(chars.end - chars.start | 0, 4) | 0);
    const _bind = chars.end - chars.start | 0;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const c = chars.buf[chars.start + _ | 0];
        _M0IPB13StringBuilderPB6Logger11write__char(buf, c);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return buf.val;
  }
  function _M0MPC16string6String31offset__of__nth__char__backward(self, n, start_offset, end_offset) {
    let _tmp = end_offset;
    let _tmp$2 = 0;
    while (true) {
      const utf16_offset = _tmp;
      const char_count = _tmp$2;
      if ((utf16_offset - 1 | 0) >= start_offset && char_count < n) {
        const c = self.charCodeAt(utf16_offset - 1 | 0);
        if (c >= 56320 && c <= 57343) {
          _tmp = utf16_offset - 2 | 0;
          _tmp$2 = char_count + 1 | 0;
          continue;
        } else {
          _tmp = utf16_offset - 1 | 0;
          _tmp$2 = char_count + 1 | 0;
          continue;
        }
      } else {
        return char_count < n || utf16_offset < start_offset ? undefined : utf16_offset;
      }
    }
  }
  function _M0MPC16string6String30offset__of__nth__char__forward(self, n, start_offset, end_offset) {
    if (start_offset >= 0 && start_offset <= end_offset) {
      let _tmp = start_offset;
      let _tmp$2 = 0;
      while (true) {
        const utf16_offset = _tmp;
        const char_count = _tmp$2;
        if (utf16_offset < end_offset && char_count < n) {
          const c = self.charCodeAt(utf16_offset);
          if (c >= 55296 && c <= 56319) {
            _tmp = utf16_offset + 2 | 0;
            _tmp$2 = char_count + 1 | 0;
            continue;
          } else {
            _tmp = utf16_offset + 1 | 0;
            _tmp$2 = char_count + 1 | 0;
            continue;
          }
        } else {
          return char_count < n || utf16_offset >= end_offset ? undefined : utf16_offset;
        }
      }
    } else {
      return $panic("Invalid start index");
    }
  }
  function _M0MPC16string6String29offset__of__nth__char_2einner(self, i, start, end) {
    let end$2;
    if (end === undefined) {
      end$2 = self.length;
    } else {
      const _Some = end;
      end$2 = _Some;
    }
    return i >= 0 ? _M0MPC16string6String30offset__of__nth__char__forward(self, i, start, end$2) : _M0MPC16string6String31offset__of__nth__char__backward(self, -i | 0, start, end$2);
  }
  function _M0IPB13StringBuilderPB6Logger11write__view(self, str) {
    self.val = `${self.val}${_M0MPC16string10StringView9to__owned(str)}`;
  }
  function _M0FPB24find__code__unit__scalar(data, start, end, code) {
    let _tmp = start;
    while (true) {
      const pos = _tmp;
      if (pos < end) {
        if (data.charCodeAt(pos) === code) {
          return pos;
        }
        _tmp = pos + 1 | 0;
        continue;
      } else {
        return -1;
      }
    }
  }
  function _M0FPB30find__code__unit__from__string(data, start, end, code) {
    return (end - start | 0) <= 8 ? _M0FPB24find__code__unit__scalar(data, start, end, code) : _M0FPB13js__index__of(data, start, end, _M0FPB22js__code__unit__string(code));
  }
  function _M0FPB28find__code__unit__from__view(target, start, end, code) {
    const target_start = target.start;
    const found = _M0FPB30find__code__unit__from__string(target.str, target_start + start | 0, target_start + end | 0, code);
    return found < 0 ? -1 : found - target_start | 0;
  }
  function _M0FPB19kmp__failure__table(pattern) {
    const m = pattern.end - pattern.start | 0;
    const table = $make_array_len_and_init(m, 0);
    let k = 0;
    let _tmp = 1;
    while (true) {
      const i = _tmp;
      if (i < m) {
        const c = pattern.str.charCodeAt(pattern.start + i | 0);
        while (true) {
          if (k > 0 && c !== pattern.str.charCodeAt(pattern.start + k | 0)) {
            const _tmp$2 = k - 1 | 0;
            k = _tmp$2 >>> 0 < table.length ? table[_tmp$2] : $oob();
            continue;
          } else {
            break;
          }
        }
        if (c === pattern.str.charCodeAt(pattern.start + k | 0)) {
          k = k + 1 | 0;
        }
        if (i >>> 0 < table.length) {
          table[i] = k;
        } else {
          $oob();
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return table;
  }
  function _M0FPB24find__pattern__kmp__from(target, pattern, start) {
    const n = target.end - target.start | 0;
    const m = pattern.end - pattern.start | 0;
    const table = _M0FPB19kmp__failure__table(pattern);
    let k = 0;
    let _tmp = start;
    while (true) {
      const i = _tmp;
      if (i < n) {
        const c = target.str.charCodeAt(target.start + i | 0);
        while (true) {
          if (k > 0 && c !== pattern.str.charCodeAt(pattern.start + k | 0)) {
            const _tmp$2 = k - 1 | 0;
            k = _tmp$2 >>> 0 < table.length ? table[_tmp$2] : $oob();
            continue;
          } else {
            break;
          }
        }
        if (c === pattern.str.charCodeAt(pattern.start + k | 0)) {
          k = k + 1 | 0;
        }
        if (k === m) {
          return (i - m | 0) + 1 | 0;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return undefined;
  }
  function _M0FPB36find__two__anchor__candidate__scalar(data, start, candidate_end, first, last_offset, last) {
    let _tmp = start;
    while (true) {
      const pos = _tmp;
      if (pos < candidate_end) {
        if (data.charCodeAt(pos) === first && data.charCodeAt(pos + last_offset | 0) === last) {
          return pos;
        }
        _tmp = pos + 1 | 0;
        continue;
      } else {
        return -1;
      }
    }
  }
  function _M0FPB42find__two__anchor__candidate__from__string(data, start, candidate_end, first, last_offset, last) {
    return _M0FPB36find__two__anchor__candidate__scalar(data, start, candidate_end, first, last_offset, last);
  }
  function _M0FPB21string__ranges__equal(left, left_start, right, right_start, length) {
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < length) {
        if (left.charCodeAt(left_start + i | 0) !== right.charCodeAt(right_start + i | 0)) {
          return false;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return true;
  }
  function _M0FPB22find__by__two__anchors(target, pattern) {
    const target_len = target.end - target.start | 0;
    const pattern_len = pattern.end - pattern.start | 0;
    const target_start = target.start;
    const pattern_start = pattern.start;
    const last_offset = pattern_len - 1 | 0;
    const candidate_end = ((target_start + target_len | 0) - pattern_len | 0) + 1 | 0;
    const first = pattern.str.charCodeAt(pattern.start);
    const last = pattern.str.charCodeAt(pattern.start + last_offset | 0);
    const middle_len = last_offset - 1 | 0;
    let _tmp = target_start;
    let _tmp$2 = 0;
    while (true) {
      const pos = _tmp;
      const failures = _tmp$2;
      if (pos < candidate_end) {
        const found = _M0FPB42find__two__anchor__candidate__from__string(target.str, pos, candidate_end, first, last_offset, last);
        if (found < 0) {
          return undefined;
        }
        if (_M0FPB21string__ranges__equal(target.str, found + 1 | 0, pattern.str, pattern_start + 1 | 0, middle_len)) {
          return found - target_start | 0;
        }
        const failures$2 = failures + 1 | 0;
        const scanned = found - target_start | 0;
        if (failures$2 > 64 || failures$2 > (4 + (scanned / 8 | 0) | 0)) {
          return _M0FPB24find__pattern__kmp__from(target, pattern, scanned + 1 | 0);
        }
        _tmp = found + 1 | 0;
        _tmp$2 = failures$2;
        continue;
      } else {
        return undefined;
      }
    }
  }
  function _M0FPB13find__pattern(target, pattern) {
    if ((pattern.end - pattern.start | 0) <= 250) {
      const target_start = target.start;
      const pattern_start = pattern.start;
      const found = _M0FPB13js__index__of(target.str, target_start, target_start + (target.end - target.start | 0) | 0, _M0FPB13js__substring(pattern.str, pattern_start, pattern_start + (pattern.end - pattern.start | 0) | 0));
      return found < 0 ? undefined : found - target_start | 0;
    } else {
      return _M0FPB22find__by__two__anchors(target, pattern);
    }
  }
  function _M0MPC16string10StringView4find(self, str) {
    const pattern_len = str.end - str.start | 0;
    switch (pattern_len) {
      case 0: {
        return _M0MPC16string10StringView4findN6constrS903;
      }
      case 1: {
        const found = _M0FPB28find__code__unit__from__view(self, 0, self.end - self.start | 0, str.str.charCodeAt(str.start));
        return found < 0 ? undefined : found;
      }
      default: {
        return pattern_len > (self.end - self.start | 0) ? undefined : _M0FPB13find__pattern(self, str);
      }
    }
  }
  function _M0MPC16string6String8find__by(self, pred) {
    const _p = new _M0TPC16string10StringView(self, 0, self.length);
    const _p$2 = _p.str;
    const _p$3 = _p.start;
    const _p$4 = _p.end;
    let _tmp = _p$3;
    let _tmp$2 = 0;
    while (true) {
      const _p$5 = _tmp;
      const _p$6 = _tmp$2;
      if (_p$5 < _p$4) {
        let _p$7;
        let _p$8;
        _L: {
          const _p$9 = _p$2.charCodeAt(_p$5);
          if (_p$9 >= 55296 && _p$9 <= 56319 && (_p$5 + 1 | 0) < _p$4) {
            const _p$10 = _p$2.charCodeAt(_p$5 + 1 | 0);
            if (_p$10 >= 56320 && _p$10 <= 57343) {
              const _tmp$3 = _p$5 + 2 | 0;
              const _p$11 = (((Math.imul(_p$9 - 55296 | 0, 1024) | 0) + _p$10 | 0) - 56320 | 0) + 65536 | 0;
              _p$7 = _tmp$3;
              _p$8 = _p$11;
              break _L;
            } else {
              const _tmp$3 = _p$5 + 1 | 0;
              const _p$11 = _p$9;
              _p$7 = _tmp$3;
              _p$8 = _p$11;
              break _L;
            }
          } else {
            const _tmp$3 = _p$5 + 1 | 0;
            const _p$10 = _p$9;
            _p$7 = _tmp$3;
            _p$8 = _p$10;
            break _L;
          }
        }
        if (pred(_p$8)) {
          return _p$6;
        }
        _tmp = _p$7;
        const _p$9 = _p$8;
        _tmp$2 = _p$6 + (_p$9 <= 65535 ? 1 : 2) | 0;
        continue;
      } else {
        return undefined;
      }
    }
  }
  function _M0MPC15array5Array13Array_2einnerGiE(capacity) {
    return capacity === 0 ? new _M0TPB5ArrayGiE([], 0) : new _M0TPB5ArrayGiE(new Array(capacity), 0);
  }
  function _M0MPC15array5Array13Array_2einnerGsE(capacity) {
    return capacity === 0 ? new _M0TPB5ArrayGsE([], 0) : new _M0TPB5ArrayGsE(new Array(capacity), 0);
  }
  function _M0FPB23array__growth__capacity(current, len, required) {
    if (required < len) {
      $panic("Array capacity overflow");
    }
    const start = current === 0 ? 8 : current;
    let _tmp = start;
    while (true) {
      const space = _tmp;
      if (space < required) {
        const next = Math.imul(space, 2) | 0;
        if (next <= space) {
          return required;
        }
        _tmp = next;
        continue;
      } else {
        return space;
      }
    }
  }
  function _M0MPC15array5Array8capacityGUiiiRPB5ArrayGiEEE(self) {
    return self.buf.length;
  }
  function _M0MPC15array5Array8capacityGiE(self) {
    return self.buf.length;
  }
  function _M0MPC15array5Array8capacityGdE(self) {
    return self.buf.length;
  }
  function _M0MPC15array5Array14resize__bufferGUiiiRPB5ArrayGiEEE(self, new_capacity) {
    const old_buf = self.buf;
    self.buf = [];
    const len = self.len;
    const copy_len = len < new_capacity ? len : new_capacity;
    const new_buf = _M0MPB18UninitializedArray23make__and__blit_2einnerGUiiiRPB5ArrayGiEEE(old_buf, new_capacity, copy_len, 0, 0);
    self.buf = new_buf;
  }
  function _M0MPC15array5Array14resize__bufferGiE(self, new_capacity) {
    const old_buf = self.buf;
    self.buf = [];
    const len = self.len;
    const copy_len = len < new_capacity ? len : new_capacity;
    const new_buf = _M0MPB18UninitializedArray23make__and__blit_2einnerGiE(old_buf, new_capacity, copy_len, 0, 0);
    self.buf = new_buf;
  }
  function _M0MPC15array5Array14resize__bufferGdE(self, new_capacity) {
    const old_buf = self.buf;
    self.buf = [];
    const len = self.len;
    const copy_len = len < new_capacity ? len : new_capacity;
    const new_buf = _M0MPB18UninitializedArray23make__and__blit_2einnerGdE(old_buf, new_capacity, copy_len, 0, 0);
    self.buf = new_buf;
  }
  function _M0MPC15array5Array7reallocGUiiiRPB5ArrayGiEEE(self, required) {
    const old_cap = _M0MPC15array5Array8capacityGUiiiRPB5ArrayGiEEE(self);
    const new_cap = _M0FPB23array__growth__capacity(old_cap, self.len, required);
    _M0MPC15array5Array14resize__bufferGUiiiRPB5ArrayGiEEE(self, new_cap);
  }
  function _M0MPC15array5Array7reallocGiE(self, required) {
    const old_cap = _M0MPC15array5Array8capacityGiE(self);
    const new_cap = _M0FPB23array__growth__capacity(old_cap, self.len, required);
    _M0MPC15array5Array14resize__bufferGiE(self, new_cap);
  }
  function _M0MPC15array5Array7reallocGdE(self, required) {
    const old_cap = _M0MPC15array5Array8capacityGdE(self);
    const new_cap = _M0FPB23array__growth__capacity(old_cap, self.len, required);
    _M0MPC15array5Array14resize__bufferGdE(self, new_cap);
  }
  function _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(self, value) {
    if (self.len === self.buf.length) {
      _M0MPC15array5Array7reallocGUiiiRPB5ArrayGiEEE(self, self.len + 1 | 0);
    }
    const length = self.len;
    self.buf[length] = value;
    self.len = length + 1 | 0;
  }
  function _M0MPC15array5Array4pushGiE(self, value) {
    if (self.len === self.buf.length) {
      _M0MPC15array5Array7reallocGiE(self, self.len + 1 | 0);
    }
    const length = self.len;
    self.buf[length] = value;
    self.len = length + 1 | 0;
  }
  function _M0MPC15array5Array4pushGdE(self, value) {
    if (self.len === self.buf.length) {
      _M0MPC15array5Array7reallocGdE(self, self.len + 1 | 0);
    }
    const length = self.len;
    self.buf[length] = value;
    self.len = length + 1 | 0;
  }
  function _M0FPB36string__contains__code__unit__scalar(str, start, end, code) {
    let _tmp = start;
    while (true) {
      const i = _tmp;
      if (i < end) {
        if (str.charCodeAt(i) === code) {
          return true;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0FPB28string__contains__code__unit(str, start, end, code) {
    return _M0FPB36string__contains__code__unit__scalar(str, start, end, code);
  }
  function _M0MPC16string10StringView20contains__code__unit(self, code) {
    return _M0FPB28string__contains__code__unit(self.str, self.start, self.end, code);
  }
  function _M0MPC16string10StringView8contains(self, str) {
    const _bind = str.end - str.start | 0;
    switch (_bind) {
      case 0: {
        return true;
      }
      case 1: {
        return _M0MPC16string10StringView20contains__code__unit(self, str.str.charCodeAt(str.start));
      }
      default: {
        const _bind$2 = _M0MPC16string10StringView4find(self, str);
        return !(_bind$2 === undefined);
      }
    }
  }
  function _M0MPC16string6String8contains(self, str) {
    return _M0MPC16string10StringView8contains(new _M0TPC16string10StringView(self, 0, self.length), str);
  }
  function _M0FPB23build__ascii__char__set(chars) {
    let bits0 = 0;
    let bits1 = 0;
    let bits2 = 0;
    let bits3 = 0;
    const _bind = chars.str;
    const _bind$2 = chars.start;
    const _bind$3 = chars.end;
    let _tmp = _bind$2;
    while (true) {
      const _string_index = _tmp;
      if (_string_index < _bind$3) {
        let _decoded_next_string_index;
        let _decoded_char;
        _L: {
          const _bind$4 = _bind.charCodeAt(_string_index);
          if (_bind$4 >= 55296 && _bind$4 <= 56319 && (_string_index + 1 | 0) < _bind$3) {
            const _bind$5 = _bind.charCodeAt(_string_index + 1 | 0);
            if (_bind$5 >= 56320 && _bind$5 <= 57343) {
              const _tmp$2 = _string_index + 2 | 0;
              const _p = (((Math.imul(_bind$4 - 55296 | 0, 1024) | 0) + _bind$5 | 0) - 56320 | 0) + 65536 | 0;
              _decoded_next_string_index = _tmp$2;
              _decoded_char = _p;
              break _L;
            } else {
              const _tmp$2 = _string_index + 1 | 0;
              const _p = _bind$4;
              _decoded_next_string_index = _tmp$2;
              _decoded_char = _p;
              break _L;
            }
          } else {
            const _tmp$2 = _string_index + 1 | 0;
            const _p = _bind$4;
            _decoded_next_string_index = _tmp$2;
            _decoded_char = _p;
            break _L;
          }
        }
        const code = _decoded_char;
        if (code >>> 0 < 128 >>> 0) {
          const bit = 1 << (code & 31);
          const _bind$4 = code >>> 5 | 0;
          switch (_bind$4) {
            case 0: {
              bits0 = bits0 | bit;
              break;
            }
            case 1: {
              bits1 = bits1 | bit;
              break;
            }
            case 2: {
              bits2 = bits2 | bit;
              break;
            }
            default: {
              bits3 = bits3 | bit;
            }
          }
        } else {
          return undefined;
        }
        _tmp = _decoded_next_string_index;
        continue;
      } else {
        break;
      }
    }
    return { _0: bits0, _1: bits1, _2: bits2, _3: bits3 };
  }
  function _M0FPB26ascii__char__set__contains(bits0, bits1, bits2, bits3, code) {
    if (code >>> 0 < 128 >>> 0) {
      const bit = 1 << (code & 31);
      const _bind = code >>> 5 | 0;
      switch (_bind) {
        case 0: {
          return (bits0 & bit) !== 0;
        }
        case 1: {
          return (bits1 & bit) !== 0;
        }
        case 2: {
          return (bits2 & bit) !== 0;
        }
        default: {
          return (bits3 & bit) !== 0;
        }
      }
    } else {
      return false;
    }
  }
  function _M0FPB34string__trim__start__ascii__scalar(str, start, end, bits0, bits1, bits2, bits3) {
    let _tmp = start;
    while (true) {
      const pos = _tmp;
      let _tmp$2;
      if (pos < end) {
        const _p = str.charCodeAt(pos);
        _tmp$2 = _M0FPB26ascii__char__set__contains(bits0, bits1, bits2, bits3, _p);
      } else {
        _tmp$2 = false;
      }
      if (_tmp$2) {
        _tmp = pos + 1 | 0;
        continue;
      } else {
        return pos;
      }
    }
  }
  function _M0FPB32string__trim__end__ascii__scalar(str, start, end, bits0, bits1, bits2, bits3) {
    let _tmp = end;
    while (true) {
      const pos = _tmp;
      let _tmp$2;
      if (pos > start) {
        const _p = str.charCodeAt(pos - 1 | 0);
        _tmp$2 = _M0FPB26ascii__char__set__contains(bits0, bits1, bits2, bits3, _p);
      } else {
        _tmp$2 = false;
      }
      if (_tmp$2) {
        _tmp = pos - 1 | 0;
        continue;
      } else {
        return pos;
      }
    }
  }
  function _M0FPB26string__trim__start__ascii(str, start, end, _chars, bits0, bits1, bits2, bits3) {
    return _M0FPB34string__trim__start__ascii__scalar(str, start, end, bits0, bits1, bits2, bits3);
  }
  function _M0FPB24string__trim__end__ascii(str, start, end, _chars, bits0, bits1, bits2, bits3) {
    return _M0FPB32string__trim__end__ascii__scalar(str, start, end, bits0, bits1, bits2, bits3);
  }
  function _M0MPC16string10StringView14contains__char(self, c) {
    const len = self.end - self.start | 0;
    if (len > 0) {
      const c$2 = c;
      if (c$2 >= 0 && c$2 <= 65535) {
        return _M0MPC16string10StringView20contains__code__unit(self, c$2 & 65535);
      } else {
        if (c$2 < 0) {
          return false;
        } else {
          if (len >= 2) {
            const adj = c$2 - 65536 | 0;
            const high = 55296 + (adj >> 10) | 0;
            if (high <= 65535) {
              const high$2 = high & 65535;
              const low = (56320 + (adj & 1023) | 0) & 65535;
              let _tmp = 0;
              while (true) {
                const i = _tmp;
                if (i < (len - 1 | 0)) {
                  if (self.str.charCodeAt(self.start + i | 0) === high$2) {
                    if (self.str.charCodeAt(self.start + (i + 1 | 0) | 0) === low) {
                      return true;
                    }
                    _tmp = i + 2 | 0;
                    continue;
                  }
                  _tmp = i + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
            } else {
              return false;
            }
          } else {
            return false;
          }
        }
      }
      return false;
    } else {
      return false;
    }
  }
  function _M0MPC16string10StringView24trim__start__with__chars(self, chars) {
    let _tmp = self;
    while (true) {
      const x = _tmp;
      if ((x.end - x.start | 0) === 0) {
        return x;
      } else {
        const _c = _M0MPC16string6String16unsafe__char__at(x.str, _M0MPC16string6String29offset__of__nth__char_2einner(x.str, 0, x.start, x.end));
        const _tmp$2 = x.str;
        const _bind = _M0MPC16string6String29offset__of__nth__char_2einner(x.str, 1, x.start, x.end);
        let _tmp$3;
        if (_bind === undefined) {
          _tmp$3 = x.end;
        } else {
          const _Some = _bind;
          _tmp$3 = _Some;
        }
        const _x = new _M0TPC16string10StringView(_tmp$2, _tmp$3, x.end);
        if (_M0MPC16string10StringView14contains__char(chars, _c)) {
          _tmp = _x;
          continue;
        } else {
          return x;
        }
      }
    }
  }
  function _M0MPC16string10StringView22trim__end__with__chars(self, chars) {
    let _tmp = self;
    while (true) {
      const x = _tmp;
      if ((x.end - x.start | 0) === 0) {
        return x;
      } else {
        const _c = _M0MPC16string6String16unsafe__char__at(x.str, _M0MPC16string6String29offset__of__nth__char_2einner(x.str, -1, x.start, x.end));
        const _x = new _M0TPC16string10StringView(x.str, x.start, _M0MPC16string6String29offset__of__nth__char_2einner(x.str, -1, x.start, x.end));
        if (_M0MPC16string10StringView14contains__char(chars, _c)) {
          _tmp = _x;
          continue;
        } else {
          return x;
        }
      }
    }
  }
  function _M0MPC16string10StringView12trim_2einner(self, chars) {
    const _bind = _M0FPB23build__ascii__char__set(chars);
    if (_bind === undefined) {
      return _M0MPC16string10StringView22trim__end__with__chars(_M0MPC16string10StringView24trim__start__with__chars(self, chars), chars);
    } else {
      const _Some = _bind;
      const _x = _Some;
      const _bits0 = _x._0;
      const _bits1 = _x._1;
      const _bits2 = _x._2;
      const _bits3 = _x._3;
      const start = _M0FPB26string__trim__start__ascii(self.str, self.start, self.end, chars, _bits0, _bits1, _bits2, _bits3);
      const end = _M0FPB24string__trim__end__ascii(self.str, start, self.end, chars, _bits0, _bits1, _bits2, _bits3);
      return new _M0TPC16string10StringView(self.str, start, end);
    }
  }
  function _M0MPC16string6String12trim_2einner(self, chars) {
    return _M0MPC16string10StringView12trim_2einner(new _M0TPC16string10StringView(self, 0, self.length), chars);
  }
  function _M0MPC16string6String4trim(self, chars$46$opt) {
    let chars;
    if (chars$46$opt === undefined) {
      chars = _M0MPC16string6String4trimN6recordS1343;
    } else {
      const _Some = chars$46$opt;
      chars = _Some;
    }
    return _M0MPC16string6String12trim_2einner(self, chars);
  }
  function _M0MPB4Iter3mapGRPC16string10StringViewsE(self, f) {
    return new _M0TPB4IterGsE(() => {
      const _bind = _M0MPB4Iter4nextGRPC16string10StringViewE(self);
      if (_bind === undefined) {
        return undefined;
      } else {
        const _Some = _bind;
        const _x = _Some;
        return f(_x);
      }
    }, self.size_hint);
  }
  function _M0MPB4Iter3mapGcRPC16string10StringViewE(self, f) {
    return new _M0TPB4IterGRPC16string10StringViewE(() => {
      const _bind = _M0MPB4Iter4nextGcE(self);
      if (_bind === -1) {
        return undefined;
      } else {
        const _Some = _bind;
        const _x = _Some;
        return f(_x);
      }
    }, self.size_hint);
  }
  function _M0IPC14char4CharPB4Show10to__string(self) {
    return String.fromCodePoint(self);
  }
  function _M0MPC16string10StringView5split(self, sep) {
    const sep_len = sep.end - sep.start | 0;
    if (sep_len === 0) {
      return _M0MPB4Iter3mapGcRPC16string10StringViewE(_M0MPC16string10StringView4iter(self), (c) => {
        const _bind = _M0IPC14char4CharPB4Show10to__string(c);
        return new _M0TPC16string10StringView(_bind, 0, _bind.length);
      });
    }
    const remaining = new _M0TPB8MutLocalGORPC16string10StringViewE(self);
    return _M0MPB4Iter3newGRPC16string10StringViewE(() => {
      const _bind = remaining.val;
      if (_bind === undefined) {
        return undefined;
      } else {
        const _Some = _bind;
        const _view = _Some;
        const _bind$2 = _M0MPC16string10StringView4find(_view, sep);
        if (_bind$2 === undefined) {
          remaining.val = undefined;
          return _view;
        } else {
          const _Some$2 = _bind$2;
          const _end = _Some$2;
          remaining.val = _M0MPC16string10StringView12unsafe__view(_view, _end + sep_len | 0, _view.end - _view.start | 0);
          return _M0MPC16string10StringView12unsafe__view(_view, 0, _end);
        }
      }
    }, undefined);
  }
  function _M0MPC16string6String5split(self, sep) {
    return _M0MPC16string10StringView5split(new _M0TPC16string10StringView(self, 0, self.length), sep);
  }
  function _M0MPB4Iter9to__arrayGiE(self) {
    const _bind = self.size_hint;
    let result;
    if (_bind === undefined) {
      result = new _M0TPB5ArrayGiE([], 0);
    } else {
      const _Some = _bind;
      const _n = _Some;
      result = _M0MPC15array5Array13Array_2einnerGiE(_n);
    }
    while (true) {
      const _bind$2 = _M0MPB4Iter4nextGiE(self);
      if (_bind$2 === undefined) {
        break;
      } else {
        const _Some = _bind$2;
        const _x = _Some;
        _M0MPC15array5Array4pushGiE(result, _x);
        continue;
      }
    }
    return result;
  }
  function _M0MPB4Iter9to__arrayGsE(self) {
    const _bind = self.size_hint;
    let result;
    if (_bind === undefined) {
      result = new _M0TPB5ArrayGsE([], 0);
    } else {
      const _Some = _bind;
      const _n = _Some;
      result = _M0MPC15array5Array13Array_2einnerGsE(_n);
    }
    while (true) {
      const _bind$2 = _M0MPB4Iter4nextGRPC16string10StringViewE(self);
      if (_bind$2 === undefined) {
        break;
      } else {
        const _Some = _bind$2;
        const _x = _Some;
        _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(result, _x);
        continue;
      }
    }
    return result;
  }
  function _M0MPC14char4Char20is__ascii__lowercase(self) {
    return self >= 97 && self <= 122;
  }
  function _M0MPC16string10StringView9to__upper(self) {
    const _p = self.str;
    const _p$2 = self.start;
    const _p$3 = self.end;
    let _bind;
    let _tmp = _p$2;
    let _tmp$2 = 0;
    while (true) {
      const _p$4 = _tmp;
      const _p$5 = _tmp$2;
      if (_p$4 < _p$3) {
        let _p$6;
        let _p$7;
        _L: {
          const _p$8 = _p.charCodeAt(_p$4);
          if (_p$8 >= 55296 && _p$8 <= 56319 && (_p$4 + 1 | 0) < _p$3) {
            const _p$9 = _p.charCodeAt(_p$4 + 1 | 0);
            if (_p$9 >= 56320 && _p$9 <= 57343) {
              const _tmp$3 = _p$4 + 2 | 0;
              const _p$10 = (((Math.imul(_p$8 - 55296 | 0, 1024) | 0) + _p$9 | 0) - 56320 | 0) + 65536 | 0;
              _p$6 = _tmp$3;
              _p$7 = _p$10;
              break _L;
            } else {
              const _tmp$3 = _p$4 + 1 | 0;
              const _p$10 = _p$8;
              _p$6 = _tmp$3;
              _p$7 = _p$10;
              break _L;
            }
          } else {
            const _tmp$3 = _p$4 + 1 | 0;
            const _p$9 = _p$8;
            _p$6 = _tmp$3;
            _p$7 = _p$9;
            break _L;
          }
        }
        if (_M0MPC14char4Char20is__ascii__lowercase(_p$7)) {
          _bind = _p$5;
          break;
        }
        _tmp = _p$6;
        const _p$8 = _p$7;
        _tmp$2 = _p$5 + (_p$8 <= 65535 ? 1 : 2) | 0;
        continue;
      } else {
        _bind = undefined;
        break;
      }
    }
    if (_bind === undefined) {
      return self;
    } else {
      const _Some = _bind;
      const _idx = _Some;
      const buf = _M0MPB13StringBuilder21StringBuilder_2einner(self.end - self.start | 0);
      const head = _M0MPC16string10StringView12unsafe__view(self, 0, _idx);
      _M0IP016_24default__implPB6Logger16write__substringGRPB13StringBuilderE(buf, head.str, head.start, head.end - head.start | 0);
      const _bind$2 = _M0MPC16string10StringView12unsafe__view(self, _idx, self.end - self.start | 0);
      const _bind$3 = _bind$2.str;
      const _bind$4 = _bind$2.start;
      const _bind$5 = _bind$2.end;
      let _tmp$3 = _bind$4;
      while (true) {
        const _string_index = _tmp$3;
        if (_string_index < _bind$5) {
          let _decoded_next_string_index;
          let _decoded_char;
          _L: {
            const _bind$6 = _bind$3.charCodeAt(_string_index);
            if (_bind$6 >= 55296 && _bind$6 <= 56319 && (_string_index + 1 | 0) < _bind$5) {
              const _bind$7 = _bind$3.charCodeAt(_string_index + 1 | 0);
              if (_bind$7 >= 56320 && _bind$7 <= 57343) {
                const _tmp$4 = _string_index + 2 | 0;
                const _p$4 = (((Math.imul(_bind$6 - 55296 | 0, 1024) | 0) + _bind$7 | 0) - 56320 | 0) + 65536 | 0;
                _decoded_next_string_index = _tmp$4;
                _decoded_char = _p$4;
                break _L;
              } else {
                const _tmp$4 = _string_index + 1 | 0;
                const _p$4 = _bind$6;
                _decoded_next_string_index = _tmp$4;
                _decoded_char = _p$4;
                break _L;
              }
            } else {
              const _tmp$4 = _string_index + 1 | 0;
              const _p$4 = _bind$6;
              _decoded_next_string_index = _tmp$4;
              _decoded_char = _p$4;
              break _L;
            }
          }
          if (_M0MPC14char4Char20is__ascii__lowercase(_decoded_char)) {
            _M0IPB13StringBuilderPB6Logger11write__char(buf, _decoded_char - 32 | 0);
          } else {
            _M0IPB13StringBuilderPB6Logger11write__char(buf, _decoded_char);
          }
          _tmp$3 = _decoded_next_string_index;
          continue;
        } else {
          break;
        }
      }
      const _bind$6 = buf.val;
      return new _M0TPC16string10StringView(_bind$6, 0, _bind$6.length);
    }
  }
  function _M0MPC16string6String9to__upper(self) {
    const _bind = _M0MPC16string6String8find__by(self, (c) => _M0MPC14char4Char20is__ascii__lowercase(c));
    if (_bind === undefined) {
      return self;
    } else {
      const _Some = _bind;
      const _idx = _Some;
      const buf = _M0MPB13StringBuilder21StringBuilder_2einner(self.length);
      const head = new _M0TPC16string10StringView(self, 0, _idx);
      _M0IP016_24default__implPB6Logger16write__substringGRPB13StringBuilderE(buf, head.str, head.start, _idx);
      const _bind_end = self.length;
      let _tmp = _idx;
      while (true) {
        const _string_index = _tmp;
        if (_string_index < _bind_end) {
          let _decoded_next_string_index;
          let _decoded_char;
          _L: {
            const _bind$2 = self.charCodeAt(_string_index);
            if (_bind$2 >= 55296 && _bind$2 <= 56319 && (_string_index + 1 | 0) < _bind_end) {
              const _bind$3 = self.charCodeAt(_string_index + 1 | 0);
              if (_bind$3 >= 56320 && _bind$3 <= 57343) {
                const _tmp$2 = _string_index + 2 | 0;
                const _p = (((Math.imul(_bind$2 - 55296 | 0, 1024) | 0) + _bind$3 | 0) - 56320 | 0) + 65536 | 0;
                _decoded_next_string_index = _tmp$2;
                _decoded_char = _p;
                break _L;
              } else {
                const _tmp$2 = _string_index + 1 | 0;
                const _p = _bind$2;
                _decoded_next_string_index = _tmp$2;
                _decoded_char = _p;
                break _L;
              }
            } else {
              const _tmp$2 = _string_index + 1 | 0;
              const _p = _bind$2;
              _decoded_next_string_index = _tmp$2;
              _decoded_char = _p;
              break _L;
            }
          }
          if (_M0MPC14char4Char20is__ascii__lowercase(_decoded_char)) {
            _M0IPB13StringBuilderPB6Logger11write__char(buf, _decoded_char - 32 | 0);
          } else {
            _M0IPB13StringBuilderPB6Logger11write__char(buf, _decoded_char);
          }
          _tmp = _decoded_next_string_index;
          continue;
        } else {
          break;
        }
      }
      return buf.val;
    }
  }
  function _M0IPC16string6StringPB12ToStringView16to__string__view(self) {
    return new _M0TPC16string10StringView(self, 0, self.length);
  }
  function _M0FPB19join__string__viewsGsE(parts, separator) {
    if ((parts.end - parts.start | 0) === 0) {
      return "";
    } else {
      if ((parts.end - parts.start | 0) === 1) {
        const _one = parts.buf[parts.start];
        return _M0MPC16string10StringView9to__owned(_M0IPC16string6StringPB12ToStringView16to__string__view(_one));
      } else {
        const _first = parts.buf[parts.start];
        const _x_buf = parts.buf;
        const _x_start = 1 + parts.start | 0;
        const _x_end = parts.end;
        const separator$2 = _M0MPC16string10StringView9to__owned(separator);
        let result = _M0MPC16string10StringView9to__owned(_M0IPC16string6StringPB12ToStringView16to__string__view(_first));
        const _bind = _x_end - _x_start | 0;
        let _tmp = 0;
        while (true) {
          const _ = _tmp;
          if (_ < _bind) {
            const part = _x_buf[_x_start + _ | 0];
            result = `${result}${separator$2}`;
            result = `${result}${_M0MPC16string10StringView9to__owned(_M0IPC16string6StringPB12ToStringView16to__string__view(part))}`;
            _tmp = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        return result;
      }
    }
  }
  function _M0IPC13int3IntPB4Show10to__string(self) {
    return _M0MPC13int3Int18to__string_2einner(self, 10);
  }
  function _M0MPC15array9ArrayView4iterGiE(self) {
    const i = new _M0TPB8MutLocalGiE(0);
    const len = self.end - self.start | 0;
    return _M0MPB4Iter3newGiE(() => {
      if (i.val < len) {
        const elem = self.buf[self.start + i.val | 0];
        i.val = i.val + 1 | 0;
        return elem;
      } else {
        return undefined;
      }
    }, len);
  }
  function _M0MPC15array9ArrayView4iterGbE(self) {
    const i = new _M0TPB8MutLocalGiE(0);
    const len = self.end - self.start | 0;
    return _M0MPB4Iter3newGbE(() => {
      if (i.val < len) {
        const elem = self.buf[self.start + i.val | 0];
        i.val = i.val + 1 | 0;
        return elem;
      } else {
        return -1;
      }
    }, len);
  }
  function _M0MPC15array10FixedArray4iterGbE(self) {
    return _M0MPC15array9ArrayView4iterGbE(new _M0TPB9ArrayViewGbE(self, 0, self.length));
  }
  function _M0MPC15array5Array4iterGiE(self) {
    return _M0MPC15array9ArrayView4iterGiE(new _M0TPB9ArrayViewGiE(self.buf, 0, self.len));
  }
  function _M0MPC15array10FixedArray11from__arrayGiE(array) {
    const _p = array.end - array.start | 0;
    if (_p <= 0) {
      return [];
    } else {
      const _p$2 = $make_array_len_and_init(_p, array.buf[array.start + 0 | 0]);
      let _tmp = 1;
      while (true) {
        const _p$3 = _tmp;
        if (_p$3 < _p) {
          if (_p$3 >>> 0 < _p$2.length) {
            _p$2[_p$3] = array.buf[array.start + _p$3 | 0];
          } else {
            $oob();
          }
          _tmp = _p$3 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      return _p$2;
    }
  }
  function _M0MPC15array9ArrayView21clamped__view_2einnerGiE(self, start, end) {
    const len = self.end - self.start | 0;
    const lo = start < 0 ? 0 : start > len ? len : start;
    let hi;
    if (end === undefined) {
      hi = len;
    } else {
      const _Some = end;
      const _end = _Some;
      hi = _end < 0 ? 0 : _end > len ? len : _end;
    }
    const hi$2 = hi > lo ? hi : lo;
    return new _M0TPB9ArrayViewGiE(self.buf, self.start + lo | 0, self.start + hi$2 | 0);
  }
  function _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(len) {
    return new _M0TPB5ArrayGORP310monkeyfist2mf4core4SnapE(new Array(len), len);
  }
  function _M0MPC15array5Array20unsafe__make__uninitGAiE(len) {
    return new _M0TPB5ArrayGAiE(new Array(len), len);
  }
  function _M0MPC15array5Array20unsafe__make__uninitGcE(len) {
    return new _M0TPB5ArrayGcE(new Array(len), len);
  }
  function _M0MPC15array5Array20unsafe__make__uninitGiE(len) {
    return new _M0TPB5ArrayGiE(new Array(len), len);
  }
  function _M0MPC15array9ArrayView4joinGsE(self, separator) {
    return _M0FPB19join__string__viewsGsE(self, separator);
  }
  function _M0IPC16option6OptionPB2Eq5equalGbE(self, other) {
    if (self === -1) {
      return other === -1;
    } else {
      const _Some = self;
      const _x = _Some;
      if (other === -1) {
        return false;
      } else {
        const _Some$2 = other;
        const _y = _Some$2;
        return _x === _y;
      }
    }
  }
  function _M0MPC16option6Option7map__orGRP310monkeyfist2mf4core12FeatureStatsiE(self, default_, f) {
    if (self === undefined) {
      return default_;
    } else {
      const _Some = self;
      const _x = _Some;
      return f(_x);
    }
  }
  function _M0MPC15array5Array31unsafe__make__and__blit_2einnerGiE(src, allocate_len, len, src_offset, dst_offset) {
    return new _M0TPB5ArrayGiE(_M0MPB18UninitializedArray23make__and__blit_2einnerGiE(src, allocate_len, len, src_offset, dst_offset), allocate_len);
  }
  function _M0MPC15array5Array31unsafe__make__and__blit_2einnerGRP310monkeyfist2mf4core2PtE(src, allocate_len, len, src_offset, dst_offset) {
    return new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE(_M0MPB18UninitializedArray23make__and__blit_2einnerGUiiiRPB5ArrayGiEEE(src, allocate_len, len, src_offset, dst_offset), allocate_len);
  }
  function _M0MPC15array9ArrayView9to__ownedGiE(self) {
    const len = self.end - self.start | 0;
    return len === 0 ? new _M0TPB5ArrayGiE([], 0) : _M0MPC15array5Array31unsafe__make__and__blit_2einnerGiE(self.buf, len, len, self.start, 0);
  }
  function _M0MPC15array9ArrayView9to__ownedGRP310monkeyfist2mf4core2PtE(self) {
    const len = self.end - self.start | 0;
    return len === 0 ? new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0) : _M0MPC15array5Array31unsafe__make__and__blit_2einnerGRP310monkeyfist2mf4core2PtE(self.buf, len, len, self.start, 0);
  }
  function _M0FPB21calc__grow__threshold(capacity) {
    return (Math.imul(capacity / 16 | 0, 13) | 0) + ((Math.imul(capacity % 16 | 0, 13) | 0) / 16 | 0) | 0;
  }
  function _M0MPC13int3Int20next__power__of__two(self) {
    if (self >= 0) {
      if (self <= 1) {
        return 1;
      }
      if (self > 1073741824) {
        return 1073741824;
      }
      return (2147483647 >> (Math.clz32(self - 1 | 0) - 1 | 0)) + 1 | 0;
    } else {
      return $panic();
    }
  }
  function _M0FPB8new__mapGsiE(capacity) {
    const capacity$2 = _M0MPC13int3Int20next__power__of__two(capacity);
    const _bind = capacity$2 - 1 | 0;
    const _bind$2 = _M0FPB21calc__grow__threshold(capacity$2);
    const _bind$3 = $make_array_len_and_init(capacity$2, undefined);
    const _bind$4 = undefined;
    return new _M0TPB3MapGsiE(_bind$3, 0, capacity$2, _bind, _bind$2, _bind$4, -1);
  }
  function _M0FPB8new__mapGiiE(capacity) {
    const capacity$2 = _M0MPC13int3Int20next__power__of__two(capacity);
    const _bind = capacity$2 - 1 | 0;
    const _bind$2 = _M0FPB21calc__grow__threshold(capacity$2);
    const _bind$3 = $make_array_len_and_init(capacity$2, undefined);
    const _bind$4 = undefined;
    return new _M0TPB3MapGiiE(_bind$3, 0, capacity$2, _bind, _bind$2, _bind$4, -1);
  }
  function _M0FPB8new__mapGsbE(capacity) {
    const capacity$2 = _M0MPC13int3Int20next__power__of__two(capacity);
    const _bind = capacity$2 - 1 | 0;
    const _bind$2 = _M0FPB21calc__grow__threshold(capacity$2);
    const _bind$3 = $make_array_len_and_init(capacity$2, undefined);
    const _bind$4 = undefined;
    return new _M0TPB3MapGsbE(_bind$3, 0, capacity$2, _bind, _bind$2, _bind$4, -1);
  }
  function _M0FPB8new__mapGibE(capacity) {
    const capacity$2 = _M0MPC13int3Int20next__power__of__two(capacity);
    const _bind = capacity$2 - 1 | 0;
    const _bind$2 = _M0FPB21calc__grow__threshold(capacity$2);
    const _bind$3 = $make_array_len_and_init(capacity$2, undefined);
    const _bind$4 = undefined;
    return new _M0TPB3MapGibE(_bind$3, 0, capacity$2, _bind, _bind$2, _bind$4, -1);
  }
  function _M0FPB21capacity__for__length(length) {
    if (length <= _M0FPB21calc__grow__threshold(1073741824)) {
      let capacity = _M0MPC13int3Int20next__power__of__two(length);
      if (length > _M0FPB21calc__grow__threshold(capacity)) {
        capacity = Math.imul(capacity, 2) | 0;
      }
      return capacity;
    } else {
      return $panic("Map capacity overflow");
    }
  }
  function _M0MPB3Map20add__entry__to__tailGsiE(self, idx, entry) {
    const _bind = self.tail;
    if (_bind === -1) {
      self.head = entry;
    } else {
      const _tmp = self.entries;
      const _p = _bind >>> 0 < _tmp.length ? _tmp[_bind] : $oob();
      let _tmp$2;
      if (_p === undefined) {
        _tmp$2 = $panic();
      } else {
        const _p$2 = _p;
        _tmp$2 = _p$2;
      }
      _tmp$2.next = entry;
    }
    self.tail = idx;
    self.entries[idx] = entry;
    self.size = self.size + 1 | 0;
  }
  function _M0MPB3Map20add__entry__to__tailGiiE(self, idx, entry) {
    const _bind = self.tail;
    if (_bind === -1) {
      self.head = entry;
    } else {
      const _tmp = self.entries;
      const _p = _bind >>> 0 < _tmp.length ? _tmp[_bind] : $oob();
      let _tmp$2;
      if (_p === undefined) {
        _tmp$2 = $panic();
      } else {
        const _p$2 = _p;
        _tmp$2 = _p$2;
      }
      _tmp$2.next = entry;
    }
    self.tail = idx;
    self.entries[idx] = entry;
    self.size = self.size + 1 | 0;
  }
  function _M0MPB3Map20add__entry__to__tailGsbE(self, idx, entry) {
    const _bind = self.tail;
    if (_bind === -1) {
      self.head = entry;
    } else {
      const _tmp = self.entries;
      const _p = _bind >>> 0 < _tmp.length ? _tmp[_bind] : $oob();
      let _tmp$2;
      if (_p === undefined) {
        _tmp$2 = $panic();
      } else {
        const _p$2 = _p;
        _tmp$2 = _p$2;
      }
      _tmp$2.next = entry;
    }
    self.tail = idx;
    self.entries[idx] = entry;
    self.size = self.size + 1 | 0;
  }
  function _M0MPB3Map20add__entry__to__tailGibE(self, idx, entry) {
    const _bind = self.tail;
    if (_bind === -1) {
      self.head = entry;
    } else {
      const _tmp = self.entries;
      const _p = _bind >>> 0 < _tmp.length ? _tmp[_bind] : $oob();
      let _tmp$2;
      if (_p === undefined) {
        _tmp$2 = $panic();
      } else {
        const _p$2 = _p;
        _tmp$2 = _p$2;
      }
      _tmp$2.next = entry;
    }
    self.tail = idx;
    self.entries[idx] = entry;
    self.size = self.size + 1 | 0;
  }
  function _M0MPB3Map10set__entryGsiE(self, entry, new_idx) {
    const _bind = entry.next;
    if (_bind === undefined) {
      self.tail = new_idx;
    } else {
      const _Some = _bind;
      const _next = _Some;
      _next.prev = new_idx;
    }
    self.entries[new_idx] = entry;
  }
  function _M0MPB3Map10set__entryGiiE(self, entry, new_idx) {
    const _bind = entry.next;
    if (_bind === undefined) {
      self.tail = new_idx;
    } else {
      const _Some = _bind;
      const _next = _Some;
      _next.prev = new_idx;
    }
    self.entries[new_idx] = entry;
  }
  function _M0MPB3Map10set__entryGsbE(self, entry, new_idx) {
    const _bind = entry.next;
    if (_bind === undefined) {
      self.tail = new_idx;
    } else {
      const _Some = _bind;
      const _next = _Some;
      _next.prev = new_idx;
    }
    self.entries[new_idx] = entry;
  }
  function _M0MPB3Map10set__entryGibE(self, entry, new_idx) {
    const _bind = entry.next;
    if (_bind === undefined) {
      self.tail = new_idx;
    } else {
      const _Some = _bind;
      const _next = _Some;
      _next.prev = new_idx;
    }
    self.entries[new_idx] = entry;
  }
  function _M0MPB3Map10push__awayGsiE(self, idx, entry) {
    let _tmp = entry.psl + 1 | 0;
    let _tmp$2 = idx + 1 & self.capacity_mask;
    let _tmp$3 = entry;
    while (true) {
      const psl = _tmp;
      const idx$2 = _tmp$2;
      const entry$2 = _tmp$3;
      const _bind = self.entries[idx$2];
      if (_bind === undefined) {
        entry$2.psl = psl;
        _M0MPB3Map10set__entryGsiE(self, entry$2, idx$2);
        return;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (psl > _curr_entry.psl) {
          entry$2.psl = psl;
          _M0MPB3Map10set__entryGsiE(self, entry$2, idx$2);
          _tmp = _curr_entry.psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          _tmp$3 = _curr_entry;
          continue;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPB3Map10push__awayGiiE(self, idx, entry) {
    let _tmp = entry.psl + 1 | 0;
    let _tmp$2 = idx + 1 & self.capacity_mask;
    let _tmp$3 = entry;
    while (true) {
      const psl = _tmp;
      const idx$2 = _tmp$2;
      const entry$2 = _tmp$3;
      const _bind = self.entries[idx$2];
      if (_bind === undefined) {
        entry$2.psl = psl;
        _M0MPB3Map10set__entryGiiE(self, entry$2, idx$2);
        return;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (psl > _curr_entry.psl) {
          entry$2.psl = psl;
          _M0MPB3Map10set__entryGiiE(self, entry$2, idx$2);
          _tmp = _curr_entry.psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          _tmp$3 = _curr_entry;
          continue;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPB3Map10push__awayGsbE(self, idx, entry) {
    let _tmp = entry.psl + 1 | 0;
    let _tmp$2 = idx + 1 & self.capacity_mask;
    let _tmp$3 = entry;
    while (true) {
      const psl = _tmp;
      const idx$2 = _tmp$2;
      const entry$2 = _tmp$3;
      const _bind = self.entries[idx$2];
      if (_bind === undefined) {
        entry$2.psl = psl;
        _M0MPB3Map10set__entryGsbE(self, entry$2, idx$2);
        return;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (psl > _curr_entry.psl) {
          entry$2.psl = psl;
          _M0MPB3Map10set__entryGsbE(self, entry$2, idx$2);
          _tmp = _curr_entry.psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          _tmp$3 = _curr_entry;
          continue;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPB3Map10push__awayGibE(self, idx, entry) {
    let _tmp = entry.psl + 1 | 0;
    let _tmp$2 = idx + 1 & self.capacity_mask;
    let _tmp$3 = entry;
    while (true) {
      const psl = _tmp;
      const idx$2 = _tmp$2;
      const entry$2 = _tmp$3;
      const _bind = self.entries[idx$2];
      if (_bind === undefined) {
        entry$2.psl = psl;
        _M0MPB3Map10set__entryGibE(self, entry$2, idx$2);
        return;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (psl > _curr_entry.psl) {
          entry$2.psl = psl;
          _M0MPB3Map10set__entryGibE(self, entry$2, idx$2);
          _tmp = _curr_entry.psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          _tmp$3 = _curr_entry;
          continue;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPB3Map20rehash__place__entryGsiE(self, outer) {
    const hash = outer.hash;
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        outer.psl = psl;
        outer.prev = self.tail;
        _M0MPB3Map20add__entry__to__tailGsiE(self, idx, outer);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr = _Some;
        if (psl > _curr.psl) {
          _M0MPB3Map10push__awayGsiE(self, idx, _curr);
          outer.psl = psl;
          outer.prev = self.tail;
          _M0MPB3Map20add__entry__to__tailGsiE(self, idx, outer);
          return undefined;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPB3Map20rehash__place__entryGiiE(self, outer) {
    const hash = outer.hash;
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        outer.psl = psl;
        outer.prev = self.tail;
        _M0MPB3Map20add__entry__to__tailGiiE(self, idx, outer);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr = _Some;
        if (psl > _curr.psl) {
          _M0MPB3Map10push__awayGiiE(self, idx, _curr);
          outer.psl = psl;
          outer.prev = self.tail;
          _M0MPB3Map20add__entry__to__tailGiiE(self, idx, outer);
          return undefined;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPB3Map20rehash__place__entryGsbE(self, outer) {
    const hash = outer.hash;
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        outer.psl = psl;
        outer.prev = self.tail;
        _M0MPB3Map20add__entry__to__tailGsbE(self, idx, outer);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr = _Some;
        if (psl > _curr.psl) {
          _M0MPB3Map10push__awayGsbE(self, idx, _curr);
          outer.psl = psl;
          outer.prev = self.tail;
          _M0MPB3Map20add__entry__to__tailGsbE(self, idx, outer);
          return undefined;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPB3Map20rehash__place__entryGibE(self, outer) {
    const hash = outer.hash;
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        outer.psl = psl;
        outer.prev = self.tail;
        _M0MPB3Map20add__entry__to__tailGibE(self, idx, outer);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr = _Some;
        if (psl > _curr.psl) {
          _M0MPB3Map10push__awayGibE(self, idx, _curr);
          outer.psl = psl;
          outer.prev = self.tail;
          _M0MPB3Map20add__entry__to__tailGibE(self, idx, outer);
          return undefined;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPB3Map4growGsiE(self) {
    const old_head = self.head;
    const new_capacity = self.capacity << 1;
    self.entries = $make_array_len_and_init(new_capacity, undefined);
    self.capacity = new_capacity;
    self.capacity_mask = new_capacity - 1 | 0;
    self.grow_at = _M0FPB21calc__grow__threshold(self.capacity);
    self.size = 0;
    self.head = undefined;
    self.tail = -1;
    let _tmp = old_head;
    while (true) {
      const x = _tmp;
      if (x === undefined) {
        return;
      } else {
        const _Some = x;
        const _e = _Some;
        const next_in_chain = _e.next;
        _e.next = undefined;
        _M0MPB3Map20rehash__place__entryGsiE(self, _e);
        _tmp = next_in_chain;
        continue;
      }
    }
  }
  function _M0MPB3Map4growGiiE(self) {
    const old_head = self.head;
    const new_capacity = self.capacity << 1;
    self.entries = $make_array_len_and_init(new_capacity, undefined);
    self.capacity = new_capacity;
    self.capacity_mask = new_capacity - 1 | 0;
    self.grow_at = _M0FPB21calc__grow__threshold(self.capacity);
    self.size = 0;
    self.head = undefined;
    self.tail = -1;
    let _tmp = old_head;
    while (true) {
      const x = _tmp;
      if (x === undefined) {
        return;
      } else {
        const _Some = x;
        const _e = _Some;
        const next_in_chain = _e.next;
        _e.next = undefined;
        _M0MPB3Map20rehash__place__entryGiiE(self, _e);
        _tmp = next_in_chain;
        continue;
      }
    }
  }
  function _M0MPB3Map4growGsbE(self) {
    const old_head = self.head;
    const new_capacity = self.capacity << 1;
    self.entries = $make_array_len_and_init(new_capacity, undefined);
    self.capacity = new_capacity;
    self.capacity_mask = new_capacity - 1 | 0;
    self.grow_at = _M0FPB21calc__grow__threshold(self.capacity);
    self.size = 0;
    self.head = undefined;
    self.tail = -1;
    let _tmp = old_head;
    while (true) {
      const x = _tmp;
      if (x === undefined) {
        return;
      } else {
        const _Some = x;
        const _e = _Some;
        const next_in_chain = _e.next;
        _e.next = undefined;
        _M0MPB3Map20rehash__place__entryGsbE(self, _e);
        _tmp = next_in_chain;
        continue;
      }
    }
  }
  function _M0MPB3Map4growGibE(self) {
    const old_head = self.head;
    const new_capacity = self.capacity << 1;
    self.entries = $make_array_len_and_init(new_capacity, undefined);
    self.capacity = new_capacity;
    self.capacity_mask = new_capacity - 1 | 0;
    self.grow_at = _M0FPB21calc__grow__threshold(self.capacity);
    self.size = 0;
    self.head = undefined;
    self.tail = -1;
    let _tmp = old_head;
    while (true) {
      const x = _tmp;
      if (x === undefined) {
        return;
      } else {
        const _Some = x;
        const _e = _Some;
        const next_in_chain = _e.next;
        _e.next = undefined;
        _M0MPB3Map20rehash__place__entryGibE(self, _e);
        _tmp = next_in_chain;
        continue;
      }
    }
  }
  function _M0MPB3Map15set__with__hashGsiE(self, key, value, hash) {
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        if (self.size >= self.grow_at) {
          _M0MPB3Map4growGsiE(self);
          _tmp = 0;
          _tmp$2 = hash & self.capacity_mask;
          continue;
        }
        const _bind$2 = self.tail;
        const _bind$3 = undefined;
        const entry = new _M0TPB5EntryGsiE(_bind$2, _bind$3, psl, hash, key, value);
        _M0MPB3Map20add__entry__to__tailGsiE(self, idx, entry);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (_curr_entry.hash === hash && _curr_entry.key === key) {
          _curr_entry.value = value;
          return undefined;
        }
        if (psl > _curr_entry.psl) {
          if (self.size >= self.grow_at) {
            _M0MPB3Map4growGsiE(self);
            _tmp = 0;
            _tmp$2 = hash & self.capacity_mask;
            continue;
          }
          _M0MPB3Map10push__awayGsiE(self, idx, _curr_entry);
          const _bind$2 = self.tail;
          const _bind$3 = undefined;
          const entry = new _M0TPB5EntryGsiE(_bind$2, _bind$3, psl, hash, key, value);
          _M0MPB3Map20add__entry__to__tailGsiE(self, idx, entry);
          return undefined;
        }
        _tmp = psl + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPB3Map15set__with__hashGiiE(self, key, value, hash) {
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        if (self.size >= self.grow_at) {
          _M0MPB3Map4growGiiE(self);
          _tmp = 0;
          _tmp$2 = hash & self.capacity_mask;
          continue;
        }
        const _bind$2 = self.tail;
        const _bind$3 = undefined;
        const entry = new _M0TPB5EntryGiiE(_bind$2, _bind$3, psl, hash, key, value);
        _M0MPB3Map20add__entry__to__tailGiiE(self, idx, entry);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (_curr_entry.hash === hash && _curr_entry.key === key) {
          _curr_entry.value = value;
          return undefined;
        }
        if (psl > _curr_entry.psl) {
          if (self.size >= self.grow_at) {
            _M0MPB3Map4growGiiE(self);
            _tmp = 0;
            _tmp$2 = hash & self.capacity_mask;
            continue;
          }
          _M0MPB3Map10push__awayGiiE(self, idx, _curr_entry);
          const _bind$2 = self.tail;
          const _bind$3 = undefined;
          const entry = new _M0TPB5EntryGiiE(_bind$2, _bind$3, psl, hash, key, value);
          _M0MPB3Map20add__entry__to__tailGiiE(self, idx, entry);
          return undefined;
        }
        _tmp = psl + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPB3Map15set__with__hashGsbE(self, key, value, hash) {
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        if (self.size >= self.grow_at) {
          _M0MPB3Map4growGsbE(self);
          _tmp = 0;
          _tmp$2 = hash & self.capacity_mask;
          continue;
        }
        const _bind$2 = self.tail;
        const _bind$3 = undefined;
        const entry = new _M0TPB5EntryGsbE(_bind$2, _bind$3, psl, hash, key, value);
        _M0MPB3Map20add__entry__to__tailGsbE(self, idx, entry);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (_curr_entry.hash === hash && _curr_entry.key === key) {
          _curr_entry.value = value;
          return undefined;
        }
        if (psl > _curr_entry.psl) {
          if (self.size >= self.grow_at) {
            _M0MPB3Map4growGsbE(self);
            _tmp = 0;
            _tmp$2 = hash & self.capacity_mask;
            continue;
          }
          _M0MPB3Map10push__awayGsbE(self, idx, _curr_entry);
          const _bind$2 = self.tail;
          const _bind$3 = undefined;
          const entry = new _M0TPB5EntryGsbE(_bind$2, _bind$3, psl, hash, key, value);
          _M0MPB3Map20add__entry__to__tailGsbE(self, idx, entry);
          return undefined;
        }
        _tmp = psl + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPB3Map15set__with__hashGibE(self, key, value, hash) {
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        if (self.size >= self.grow_at) {
          _M0MPB3Map4growGibE(self);
          _tmp = 0;
          _tmp$2 = hash & self.capacity_mask;
          continue;
        }
        const _bind$2 = self.tail;
        const _bind$3 = undefined;
        const entry = new _M0TPB5EntryGibE(_bind$2, _bind$3, psl, hash, key, value);
        _M0MPB3Map20add__entry__to__tailGibE(self, idx, entry);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (_curr_entry.hash === hash && _curr_entry.key === key) {
          _curr_entry.value = value;
          return undefined;
        }
        if (psl > _curr_entry.psl) {
          if (self.size >= self.grow_at) {
            _M0MPB3Map4growGibE(self);
            _tmp = 0;
            _tmp$2 = hash & self.capacity_mask;
            continue;
          }
          _M0MPB3Map10push__awayGibE(self, idx, _curr_entry);
          const _bind$2 = self.tail;
          const _bind$3 = undefined;
          const entry = new _M0TPB5EntryGibE(_bind$2, _bind$3, psl, hash, key, value);
          _M0MPB3Map20add__entry__to__tailGibE(self, idx, entry);
          return undefined;
        }
        _tmp = psl + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPB3Map3setGsiE(self, key, value) {
    _M0MPB3Map15set__with__hashGsiE(self, key, value, _M0IPC16string6StringPB4Hash4hash(key));
  }
  function _M0MPB3Map3setGiiE(self, key, value) {
    _M0MPB3Map15set__with__hashGiiE(self, key, value, _M0IPC13int3IntPB4Hash4hash(key));
  }
  function _M0MPB3Map3setGsbE(self, key, value) {
    _M0MPB3Map15set__with__hashGsbE(self, key, value, _M0IPC16string6StringPB4Hash4hash(key));
  }
  function _M0MPB3Map3setGibE(self, key, value) {
    _M0MPB3Map15set__with__hashGibE(self, key, value, _M0IPC13int3IntPB4Hash4hash(key));
  }
  function _M0MPB3Map3MapGsiE(arr, capacity) {
    const length = arr.end - arr.start | 0;
    let capacity$2;
    if (capacity === undefined) {
      capacity$2 = length === 0 ? 8 : _M0FPB21capacity__for__length(length);
    } else {
      const _Some = capacity;
      const _capacity = _Some;
      capacity$2 = _M0FPB21capacity__for__length(_capacity > length ? _capacity : length);
    }
    const m = _M0FPB8new__mapGsiE(capacity$2);
    const _bind = arr.end - arr.start | 0;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const e = arr.buf[arr.start + _ | 0];
        _M0MPB3Map3setGsiE(m, e._0, e._1);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return m;
  }
  function _M0MPB3Map3MapGiiE(arr, capacity) {
    const length = arr.end - arr.start | 0;
    let capacity$2;
    if (capacity === undefined) {
      capacity$2 = length === 0 ? 8 : _M0FPB21capacity__for__length(length);
    } else {
      const _Some = capacity;
      const _capacity = _Some;
      capacity$2 = _M0FPB21capacity__for__length(_capacity > length ? _capacity : length);
    }
    const m = _M0FPB8new__mapGiiE(capacity$2);
    const _bind = arr.end - arr.start | 0;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const e = arr.buf[arr.start + _ | 0];
        _M0MPB3Map3setGiiE(m, e._0, e._1);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return m;
  }
  function _M0MPB3Map3MapGsbE(arr, capacity) {
    const length = arr.end - arr.start | 0;
    let capacity$2;
    if (capacity === undefined) {
      capacity$2 = length === 0 ? 8 : _M0FPB21capacity__for__length(length);
    } else {
      const _Some = capacity;
      const _capacity = _Some;
      capacity$2 = _M0FPB21capacity__for__length(_capacity > length ? _capacity : length);
    }
    const m = _M0FPB8new__mapGsbE(capacity$2);
    const _bind = arr.end - arr.start | 0;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const e = arr.buf[arr.start + _ | 0];
        _M0MPB3Map3setGsbE(m, e._0, e._1);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return m;
  }
  function _M0MPB3Map3MapGibE(arr, capacity) {
    const length = arr.end - arr.start | 0;
    let capacity$2;
    if (capacity === undefined) {
      capacity$2 = length === 0 ? 8 : _M0FPB21capacity__for__length(length);
    } else {
      const _Some = capacity;
      const _capacity = _Some;
      capacity$2 = _M0FPB21capacity__for__length(_capacity > length ? _capacity : length);
    }
    const m = _M0FPB8new__mapGibE(capacity$2);
    const _bind = arr.end - arr.start | 0;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const e = arr.buf[arr.start + _ | 0];
        _M0MPB3Map3setGibE(m, e._0, e._1);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return m;
  }
  function _M0MPB3Map3getGsiE(self, key) {
    const hash = _M0IPC16string6StringPB4Hash4hash(key);
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const i = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        return undefined;
      } else {
        const _Some = _bind;
        const _entry = _Some;
        if (_entry.hash === hash && _entry.key === key) {
          return _entry.value;
        }
        if (i > _entry.psl) {
          return undefined;
        }
        _tmp = i + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPB3Map3getGiiE(self, key) {
    const hash = _M0IPC13int3IntPB4Hash4hash(key);
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const i = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        return undefined;
      } else {
        const _Some = _bind;
        const _entry = _Some;
        if (_entry.hash === hash && _entry.key === key) {
          return _entry.value;
        }
        if (i > _entry.psl) {
          return undefined;
        }
        _tmp = i + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPB3Map2atGiiE(self, key) {
    const hash = _M0IPC13int3IntPB4Hash4hash(key);
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const i = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        $panic();
      } else {
        const _Some = _bind;
        const _entry = _Some;
        if (_entry.hash === hash && _entry.key === key) {
          return _entry.value;
        }
        if (i <= _entry.psl) {
          _tmp = i + 1 | 0;
          _tmp$2 = idx + 1 & self.capacity_mask;
          continue;
        } else {
          $panic();
        }
      }
      continue;
    }
  }
  function _M0MPB3Map8containsGiiE(self, key) {
    const hash = _M0IPC13int3IntPB4Hash4hash(key);
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const i = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        return false;
      } else {
        const _Some = _bind;
        const _entry = _Some;
        if (_entry.hash === hash && _entry.key === key) {
          return true;
        }
        if (i > _entry.psl) {
          return false;
        }
        _tmp = i + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPB3Map8containsGsbE(self, key) {
    const hash = _M0IPC16string6StringPB4Hash4hash(key);
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const i = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        return false;
      } else {
        const _Some = _bind;
        const _entry = _Some;
        if (_entry.hash === hash && _entry.key === key) {
          return true;
        }
        if (i > _entry.psl) {
          return false;
        }
        _tmp = i + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPB3Map8containsGibE(self, key) {
    const hash = _M0IPC13int3IntPB4Hash4hash(key);
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const i = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        return false;
      } else {
        const _Some = _bind;
        const _entry = _Some;
        if (_entry.hash === hash && _entry.key === key) {
          return true;
        }
        if (i > _entry.psl) {
          return false;
        }
        _tmp = i + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPC15array10FixedArray12fill_2einnerGiE(self, value, start, end) {
    const array_length = self.length;
    if (array_length > 0) {
      if (start >= 0 && start < array_length) {
        let length;
        if (end === undefined) {
          length = array_length - start | 0;
        } else {
          const _Some = end;
          const _e = _Some;
          length = _e >= start && _e <= array_length ? _e - start | 0 : $panic();
        }
        self.fill(value, start, start + length);
        return;
      } else {
        $panic();
        return;
      }
    } else {
      return;
    }
  }
  function _M0MPC15array10FixedArray12fill_2einnerGbE(self, value, start, end) {
    const array_length = self.length;
    if (array_length > 0) {
      if (start >= 0 && start < array_length) {
        let length;
        if (end === undefined) {
          length = array_length - start | 0;
        } else {
          const _Some = end;
          const _e = _Some;
          length = _e >= start && _e <= array_length ? _e - start | 0 : $panic();
        }
        self.fill(value, start, start + length);
        return;
      } else {
        $panic();
        return;
      }
    } else {
      return;
    }
  }
  function _M0MPB3Map4keysGibE(self) {
    const curr_entry = new _M0TPB8MutLocalGORPB5EntryGibEE(self.head);
    const len = self.size;
    const remaining = new _M0TPB8MutLocalGiE(len);
    return _M0MPB4Iter3newGiE(() => {
      _L: {
        if (remaining.val > 0) {
          const _bind = curr_entry.val;
          if (_bind === undefined) {
            break _L;
          } else {
            const _Some = _bind;
            const _x = _Some;
            const _key = _x.key;
            const _next = _x.next;
            curr_entry.val = _next;
            remaining.val = remaining.val - 1 | 0;
            return _key;
          }
        } else {
          break _L;
        }
      }
      return undefined;
    }, len);
  }
  function _M0MPB4Iter5countGbE(self) {
    let _tmp = 0;
    while (true) {
      const count = _tmp;
      const _bind = _M0MPB4Iter4nextGbE(self);
      if (_bind === -1) {
        return count;
      } else {
        _tmp = count + 1 | 0;
        continue;
      }
    }
  }
  function _M0MPB4Iter6filterGbE(self, f) {
    return _M0MPB4Iter3newGbE(() => {
      while (true) {
        const _bind = _M0MPB4Iter4nextGbE(self);
        if (_bind === -1) {
          return -1;
        } else {
          const _Some = _bind;
          const _x = _Some;
          if (f(_x)) {
            return _x;
          }
          continue;
        }
      }
    }, undefined);
  }
  function _M0IPC16string6StringPB4Hash4hash(self) {
    let acc = (_M0FPB4seed >>> 0) + (374761393 >>> 0) | 0;
    const _bind = self.length;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        acc = (acc >>> 0) + (4 >>> 0) | 0;
        const v = self.charCodeAt(i);
        acc = _M0FPB13consume4__acc(acc, v);
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return _M0FPB13finalize__acc(acc);
  }
  function _M0IPC13int3IntPB4Hash4hash(self) {
    const acc = (((_M0FPB4seed >>> 0) + (374761393 >>> 0) | 0) >>> 0) + (4 >>> 0) | 0;
    return _M0FPB13finalize__acc(_M0FPB13consume4__acc(acc, self));
  }
  function _M0MPC16double6Double7to__int(self) {
    return self !== self ? 0 : self >= 2147483647 ? 2147483647 : self <= -2147483648 ? -2147483648 : self | 0;
  }
  function _M0MPC16double6Double5floor(_tmp) {
    return Math.floor(_tmp);
  }
  function _M0MPC15array5Array21clamped__view_2einnerGiE(self, start, end) {
    const len = self.len;
    const lo = start < 0 ? 0 : start > len ? len : start;
    let hi;
    if (end === undefined) {
      hi = len;
    } else {
      const _Some = end;
      const _end = _Some;
      hi = _end < 0 ? 0 : _end > len ? len : _end;
    }
    const hi$2 = hi > lo ? hi : lo;
    return new _M0TPB9ArrayViewGiE(self.buf, lo, hi$2);
  }
  function _M0MPC15array5Array21clamped__view_2einnerGRP310monkeyfist2mf4core2PtE(self, start, end) {
    const len = self.len;
    const lo = start < 0 ? 0 : start > len ? len : start;
    let hi;
    if (end === undefined) {
      hi = len;
    } else {
      const _Some = end;
      const _end = _Some;
      hi = _end < 0 ? 0 : _end > len ? len : _end;
    }
    const hi$2 = hi > lo ? hi : lo;
    return new _M0TPB9ArrayViewGRP310monkeyfist2mf4core2PtE(self.buf, lo, hi$2);
  }
  function _M0FPB8collapse(runs, stop) {
    const n = runs.len;
    let _tmp;
    if (n >= 2) {
      let _tmp$2;
      const _bind = n - 1 | 0;
      if (_bind < 0 || _bind >= runs.len) {
        $panic();
      }
      const _tmp$3 = runs.buf[_bind].start;
      const _bind$2 = n - 1 | 0;
      if (_bind$2 < 0 || _bind$2 >= runs.len) {
        $panic();
      }
      if ((_tmp$3 + runs.buf[_bind$2].len | 0) === stop) {
        _tmp$2 = true;
      } else {
        let _tmp$4;
        const _bind$3 = n - 2 | 0;
        if (_bind$3 < 0 || _bind$3 >= runs.len) {
          $panic();
        }
        const _tmp$5 = runs.buf[_bind$3].len;
        const _bind$4 = n - 1 | 0;
        if (_bind$4 < 0 || _bind$4 >= runs.len) {
          $panic();
        }
        if (_tmp$5 <= runs.buf[_bind$4].len) {
          _tmp$4 = true;
        } else {
          let _tmp$6;
          let _tmp$7;
          if (n >= 3) {
            const _bind$5 = n - 3 | 0;
            if (_bind$5 < 0 || _bind$5 >= runs.len) {
              $panic();
            }
            const _tmp$8 = runs.buf[_bind$5].len;
            const _bind$6 = n - 2 | 0;
            if (_bind$6 < 0 || _bind$6 >= runs.len) {
              $panic();
            }
            const _tmp$9 = runs.buf[_bind$6].len;
            const _bind$7 = n - 1 | 0;
            if (_bind$7 < 0 || _bind$7 >= runs.len) {
              $panic();
            }
            _tmp$7 = _tmp$8 <= (_tmp$9 + runs.buf[_bind$7].len | 0);
          } else {
            _tmp$7 = false;
          }
          if (_tmp$7) {
            _tmp$6 = true;
          } else {
            let _tmp$8;
            if (n >= 4) {
              const _bind$5 = n - 4 | 0;
              if (_bind$5 < 0 || _bind$5 >= runs.len) {
                $panic();
              }
              const _tmp$9 = runs.buf[_bind$5].len;
              const _bind$6 = n - 3 | 0;
              if (_bind$6 < 0 || _bind$6 >= runs.len) {
                $panic();
              }
              const _tmp$10 = runs.buf[_bind$6].len;
              const _bind$7 = n - 2 | 0;
              if (_bind$7 < 0 || _bind$7 >= runs.len) {
                $panic();
              }
              _tmp$8 = _tmp$9 <= (_tmp$10 + runs.buf[_bind$7].len | 0);
            } else {
              _tmp$8 = false;
            }
            _tmp$6 = _tmp$8;
          }
          _tmp$4 = _tmp$6;
        }
        _tmp$2 = _tmp$4;
      }
      _tmp = _tmp$2;
    } else {
      _tmp = false;
    }
    if (_tmp) {
      let _tmp$2;
      if (n >= 3) {
        const _bind = n - 3 | 0;
        if (_bind < 0 || _bind >= runs.len) {
          $panic();
        }
        const _tmp$3 = runs.buf[_bind].len;
        const _bind$2 = n - 1 | 0;
        if (_bind$2 < 0 || _bind$2 >= runs.len) {
          $panic();
        }
        _tmp$2 = _tmp$3 < runs.buf[_bind$2].len;
      } else {
        _tmp$2 = false;
      }
      if (_tmp$2) {
        return n - 3 | 0;
      } else {
        return n - 2 | 0;
      }
    } else {
      return undefined;
    }
  }
  function _M0FPB16find__streak__byGUiiEE(arr, cmp) {
    const len = arr.end - arr.start | 0;
    if (len < 2) {
      return { _0: len, _1: false };
    }
    const assume_reverse = cmp(arr.buf[arr.start + 1 | 0], arr.buf[arr.start]) < 0;
    if (assume_reverse) {
      let end;
      let _tmp = 2;
      while (true) {
        const idx = _tmp;
        if (idx < len) {
          _L: {
            if (cmp(arr.buf[arr.start + idx | 0], arr.buf[arr.start + (idx - 1 | 0) | 0]) < 0) {
              break _L;
            }
            end = idx;
            break;
          }
          _tmp = idx + 1 | 0;
          continue;
        } else {
          end = len;
          break;
        }
      }
      return { _0: end, _1: true };
    } else {
      let end;
      let _tmp = 2;
      while (true) {
        const idx = _tmp;
        if (idx < len) {
          _L: {
            if (cmp(arr.buf[arr.start + idx | 0], arr.buf[arr.start + (idx - 1 | 0) | 0]) >= 0) {
              break _L;
            }
            end = idx;
            break;
          }
          _tmp = idx + 1 | 0;
          continue;
        } else {
          end = len;
          break;
        }
      }
      return { _0: end, _1: false };
    }
  }
  function _M0FPB16find__streak__byGiE(arr, cmp) {
    const len = arr.end - arr.start | 0;
    if (len < 2) {
      return { _0: len, _1: false };
    }
    const assume_reverse = cmp(arr.buf[arr.start + 1 | 0], arr.buf[arr.start]) < 0;
    if (assume_reverse) {
      let end;
      let _tmp = 2;
      while (true) {
        const idx = _tmp;
        if (idx < len) {
          _L: {
            if (cmp(arr.buf[arr.start + idx | 0], arr.buf[arr.start + (idx - 1 | 0) | 0]) < 0) {
              break _L;
            }
            end = idx;
            break;
          }
          _tmp = idx + 1 | 0;
          continue;
        } else {
          end = len;
          break;
        }
      }
      return { _0: end, _1: true };
    } else {
      let end;
      let _tmp = 2;
      while (true) {
        const idx = _tmp;
        if (idx < len) {
          _L: {
            if (cmp(arr.buf[arr.start + idx | 0], arr.buf[arr.start + (idx - 1 | 0) | 0]) >= 0) {
              break _L;
            }
            end = idx;
            break;
          }
          _tmp = idx + 1 | 0;
          continue;
        } else {
          end = len;
          break;
        }
      }
      return { _0: end, _1: false };
    }
  }
  function _M0FPB9merge__byGUiiEE(arr, mid, cmp) {
    const buf_len = (arr.end - arr.start | 0) - mid | 0;
    const buf = _M0MPB18UninitializedArray23make__and__blit_2einnerGUiiiRPB5ArrayGiEEE(arr.buf, buf_len, buf_len, arr.start + mid | 0, 0);
    let buf_remaining;
    let _tmp = mid - 1 | 0;
    let _tmp$2 = buf_len - 1 | 0;
    let _tmp$3 = (mid + buf_len | 0) - 1 | 0;
    while (true) {
      const p1 = _tmp;
      const p2 = _tmp$2;
      const p = _tmp$3;
      if (p1 >= 0 && p2 >= 0) {
        if (cmp(arr.buf[arr.start + p1 | 0], p2 >>> 0 < buf.length ? buf[p2] : $oob()) > 0) {
          arr.buf[arr.start + p | 0] = arr.buf[arr.start + p1 | 0];
          _tmp = p1 - 1 | 0;
          _tmp$3 = p - 1 | 0;
          continue;
        } else {
          arr.buf[arr.start + p | 0] = p2 >>> 0 < buf.length ? buf[p2] : $oob();
          _tmp$2 = p2 - 1 | 0;
          _tmp$3 = p - 1 | 0;
          continue;
        }
      } else {
        buf_remaining = p2;
        break;
      }
    }
    if (buf_remaining >= 0) {
      _M0MPB18UninitializedArray12unsafe__blitGUiiiRPB5ArrayGiEEE(arr.buf, arr.start, buf, 0, buf_remaining + 1 | 0);
      return;
    } else {
      return;
    }
  }
  function _M0FPB9merge__byGiE(arr, mid, cmp) {
    const buf_len = (arr.end - arr.start | 0) - mid | 0;
    const buf = _M0MPB18UninitializedArray23make__and__blit_2einnerGiE(arr.buf, buf_len, buf_len, arr.start + mid | 0, 0);
    let buf_remaining;
    let _tmp = mid - 1 | 0;
    let _tmp$2 = buf_len - 1 | 0;
    let _tmp$3 = (mid + buf_len | 0) - 1 | 0;
    while (true) {
      const p1 = _tmp;
      const p2 = _tmp$2;
      const p = _tmp$3;
      if (p1 >= 0 && p2 >= 0) {
        if (cmp(arr.buf[arr.start + p1 | 0], p2 >>> 0 < buf.length ? buf[p2] : $oob()) > 0) {
          arr.buf[arr.start + p | 0] = arr.buf[arr.start + p1 | 0];
          _tmp = p1 - 1 | 0;
          _tmp$3 = p - 1 | 0;
          continue;
        } else {
          arr.buf[arr.start + p | 0] = p2 >>> 0 < buf.length ? buf[p2] : $oob();
          _tmp$2 = p2 - 1 | 0;
          _tmp$3 = p - 1 | 0;
          continue;
        }
      } else {
        buf_remaining = p2;
        break;
      }
    }
    if (buf_remaining >= 0) {
      _M0MPB18UninitializedArray12unsafe__blitGiE(arr.buf, arr.start, buf, 0, buf_remaining + 1 | 0);
      return;
    } else {
      return;
    }
  }
  function _M0MPC15array12MutArrayView4swapGUiiEE(arr, i, j) {
    const temp = arr.buf[arr.start + i | 0];
    arr.buf[arr.start + i | 0] = arr.buf[arr.start + j | 0];
    arr.buf[arr.start + j | 0] = temp;
  }
  function _M0MPC15array12MutArrayView4swapGiE(arr, i, j) {
    const temp = arr.buf[arr.start + i | 0];
    arr.buf[arr.start + i | 0] = arr.buf[arr.start + j | 0];
    arr.buf[arr.start + j | 0] = temp;
  }
  function _M0MPC15array12MutArrayView19insertion__sort__byGUiiEE(arr, cmp) {
    const _bind = arr.end - arr.start | 0;
    let _tmp = 1;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        let _tmp$2 = i;
        while (true) {
          const j = _tmp$2;
          if (j > 0 && cmp(arr.buf[arr.start + j | 0], arr.buf[arr.start + (j - 1 | 0) | 0]) < 0) {
            _M0MPC15array12MutArrayView4swapGUiiEE(arr, j, j - 1 | 0);
            _tmp$2 = j - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0MPC15array12MutArrayView19insertion__sort__byGiE(arr, cmp) {
    const _bind = arr.end - arr.start | 0;
    let _tmp = 1;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        let _tmp$2 = i;
        while (true) {
          const j = _tmp$2;
          if (j > 0 && cmp(arr.buf[arr.start + j | 0], arr.buf[arr.start + (j - 1 | 0) | 0]) < 0) {
            _M0MPC15array12MutArrayView4swapGiE(arr, j, j - 1 | 0);
            _tmp$2 = j - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0MPC15array12MutArrayView5sliceGUiiEE(arr, start, end) {
    const _bind = arr.end - arr.start | 0;
    if (start < 0 || (start > end || end > _bind)) {
      $panic();
    }
    return new _M0TPB12MutArrayViewGUiiEE(arr.buf, start + arr.start | 0, end + arr.start | 0);
  }
  function _M0MPC15array12MutArrayView5sliceGiE(arr, start, end) {
    const _bind = arr.end - arr.start | 0;
    if (start < 0 || (start > end || end > _bind)) {
      $panic();
    }
    return new _M0TPB12MutArrayViewGiE(arr.buf, start + arr.start | 0, end + arr.start | 0);
  }
  function _M0FPB26provide__sorted__batch__byGUiiEE(arr, start, end, cmp) {
    const len = arr.end - arr.start | 0;
    if ((end - start | 0) < 10 && end < len) {
      const _p = start + 10 | 0;
      const sort_end = len > _p ? _p : len;
      _M0MPC15array12MutArrayView19insertion__sort__byGUiiEE(_M0MPC15array12MutArrayView5sliceGUiiEE(arr, start, sort_end), cmp);
      return sort_end;
    } else {
      return end;
    }
  }
  function _M0FPB26provide__sorted__batch__byGiE(arr, start, end, cmp) {
    const len = arr.end - arr.start | 0;
    if ((end - start | 0) < 10 && end < len) {
      const _p = start + 10 | 0;
      const sort_end = len > _p ? _p : len;
      _M0MPC15array12MutArrayView19insertion__sort__byGiE(_M0MPC15array12MutArrayView5sliceGiE(arr, start, sort_end), cmp);
      return sort_end;
    } else {
      return end;
    }
  }
  function _M0MPC15array5Array28unsafe__truncate__to__lengthGiE(self, new_len) {
    if (new_len <= self.len) {
      self.len = new_len;
      return;
    } else {
      $panic();
      return;
    }
  }
  function _M0MPC15array5Array28unsafe__truncate__to__lengthGdE(self, new_len) {
    if (new_len <= self.len) {
      self.len = new_len;
      return;
    } else {
      $panic();
      return;
    }
  }
  function _M0MPC15array5Array28unsafe__truncate__to__lengthGRPB10TimSortRunE(self, new_len) {
    if (new_len <= self.len) {
      self.len = new_len;
      return;
    } else {
      $panic();
      return;
    }
  }
  function _M0MPC15array5Array6removeGRPB10TimSortRunE(self, index) {
    if (index >= 0 && index < self.len) {
      const value = self.buf[index];
      _M0MPB18UninitializedArray12unsafe__blitGUiiiRPB5ArrayGiEEE(self.buf, index, self.buf, index + 1 | 0, (self.len - index | 0) - 1 | 0);
      _M0MPC15array5Array28unsafe__truncate__to__lengthGRPB10TimSortRunE(self, self.len - 1 | 0);
      return value;
    } else {
      const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(60);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "index out of bounds: the len is from 0 to ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, self.len);
      _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, " but the index is ");
      _M0MPB13StringBuilder13write__objectGiE(_string_builder, index);
      return $panic(_string_builder.val);
    }
  }
  function _M0MPC15array12MutArrayView14rev__in__placeGUiiEE(arr) {
    const len = arr.end - arr.start | 0;
    const mid_len = len / 2 | 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < mid_len) {
        const j = (len - i | 0) - 1 | 0;
        const temp = arr.buf[arr.start + i | 0];
        arr.buf[arr.start + i | 0] = arr.buf[arr.start + j | 0];
        arr.buf[arr.start + j | 0] = temp;
        _tmp = i + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0MPC15array12MutArrayView14rev__in__placeGiE(arr) {
    const len = arr.end - arr.start | 0;
    const mid_len = len / 2 | 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < mid_len) {
        const j = (len - i | 0) - 1 | 0;
        const temp = arr.buf[arr.start + i | 0];
        arr.buf[arr.start + i | 0] = arr.buf[arr.start + j | 0];
        arr.buf[arr.start + j | 0] = temp;
        _tmp = i + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0FPB11timsort__byGUiiEE(arr, cmp) {
    const len = arr.end - arr.start | 0;
    if (len <= 20) {
      _M0MPC15array12MutArrayView19insertion__sort__byGUiiEE(arr, cmp);
      return undefined;
    }
    const runs = new _M0TPB5ArrayGRPB10TimSortRunE([], 0);
    let _tmp = 0;
    let _tmp$2 = 0;
    while (true) {
      const start = _tmp;
      const end = _tmp$2;
      if (end < len) {
        const _bind = arr.end - arr.start | 0;
        if (start < 0 || start > _bind) {
          $panic();
        }
        const _bind$2 = _M0FPB16find__streak__byGUiiEE(new _M0TPB12MutArrayViewGUiiEE(arr.buf, start + arr.start | 0, _bind + arr.start | 0), cmp);
        const _streak_end = _bind$2._0;
        const _was_reversed = _bind$2._1;
        const end$2 = end + _streak_end | 0;
        if (_was_reversed) {
          const _bind$3 = arr.end - arr.start | 0;
          if (start < 0 || (start > end$2 || end$2 > _bind$3)) {
            $panic();
          }
          _M0MPC15array12MutArrayView14rev__in__placeGUiiEE(new _M0TPB12MutArrayViewGUiiEE(arr.buf, start + arr.start | 0, end$2 + arr.start | 0));
        }
        const end$3 = _M0FPB26provide__sorted__batch__byGUiiEE(arr, start, end$2, cmp);
        const _bind$3 = end$3 - start | 0;
        _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(runs, new _M0TPB10TimSortRun(_bind$3, start));
        while (true) {
          const _bind$4 = _M0FPB8collapse(runs, len);
          if (_bind$4 === undefined) {
            break;
          } else {
            const _Some = _bind$4;
            const _r = _Some;
            if (_r < 0 || _r >= runs.len) {
              $panic();
            }
            const left = runs.buf[_r];
            const _bind$5 = _r + 1 | 0;
            if (_bind$5 < 0 || _bind$5 >= runs.len) {
              $panic();
            }
            const right = runs.buf[_bind$5];
            _M0FPB9merge__byGUiiEE(_M0MPC15array12MutArrayView5sliceGUiiEE(arr, left.start, right.start + right.len | 0), left.len, cmp);
            const _bind$6 = _r + 1 | 0;
            const _bind$7 = left.start;
            const _bind$8 = left.len + right.len | 0;
            const _bind$9 = new _M0TPB10TimSortRun(_bind$8, _bind$7);
            if (_bind$6 < 0 || _bind$6 >= runs.len) {
              $panic();
            }
            runs.buf[_bind$6] = _bind$9;
            _M0MPC15array5Array6removeGRPB10TimSortRunE(runs, _r);
          }
          continue;
        }
        _tmp = end$3;
        _tmp$2 = end$3;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0FPB11timsort__byGiE(arr, cmp) {
    const len = arr.end - arr.start | 0;
    if (len <= 20) {
      _M0MPC15array12MutArrayView19insertion__sort__byGiE(arr, cmp);
      return undefined;
    }
    const runs = new _M0TPB5ArrayGRPB10TimSortRunE([], 0);
    let _tmp = 0;
    let _tmp$2 = 0;
    while (true) {
      const start = _tmp;
      const end = _tmp$2;
      if (end < len) {
        const _bind = arr.end - arr.start | 0;
        if (start < 0 || start > _bind) {
          $panic();
        }
        const _bind$2 = _M0FPB16find__streak__byGiE(new _M0TPB12MutArrayViewGiE(arr.buf, start + arr.start | 0, _bind + arr.start | 0), cmp);
        const _streak_end = _bind$2._0;
        const _was_reversed = _bind$2._1;
        const end$2 = end + _streak_end | 0;
        if (_was_reversed) {
          const _bind$3 = arr.end - arr.start | 0;
          if (start < 0 || (start > end$2 || end$2 > _bind$3)) {
            $panic();
          }
          _M0MPC15array12MutArrayView14rev__in__placeGiE(new _M0TPB12MutArrayViewGiE(arr.buf, start + arr.start | 0, end$2 + arr.start | 0));
        }
        const end$3 = _M0FPB26provide__sorted__batch__byGiE(arr, start, end$2, cmp);
        const _bind$3 = end$3 - start | 0;
        _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(runs, new _M0TPB10TimSortRun(_bind$3, start));
        while (true) {
          const _bind$4 = _M0FPB8collapse(runs, len);
          if (_bind$4 === undefined) {
            break;
          } else {
            const _Some = _bind$4;
            const _r = _Some;
            if (_r < 0 || _r >= runs.len) {
              $panic();
            }
            const left = runs.buf[_r];
            const _bind$5 = _r + 1 | 0;
            if (_bind$5 < 0 || _bind$5 >= runs.len) {
              $panic();
            }
            const right = runs.buf[_bind$5];
            _M0FPB9merge__byGiE(_M0MPC15array12MutArrayView5sliceGiE(arr, left.start, right.start + right.len | 0), left.len, cmp);
            const _bind$6 = _r + 1 | 0;
            const _bind$7 = left.start;
            const _bind$8 = left.len + right.len | 0;
            const _bind$9 = new _M0TPB10TimSortRun(_bind$8, _bind$7);
            if (_bind$6 < 0 || _bind$6 >= runs.len) {
              $panic();
            }
            runs.buf[_bind$6] = _bind$9;
            _M0MPC15array5Array6removeGRPB10TimSortRunE(runs, _r);
          }
          continue;
        }
        _tmp = end$3;
        _tmp$2 = end$3;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0MPC15array12MutArrayView16stable__sort__byGUiiEE(self, cmp) {
    _M0FPB11timsort__byGUiiEE(self, cmp);
  }
  function _M0MPC15array12MutArrayView16stable__sort__byGiE(self, cmp) {
    _M0FPB11timsort__byGiE(self, cmp);
  }
  function _M0MPC15array5Array12unsafe__blitGORPB5ArrayGRP310monkeyfist2mf4core2PtEE(dst, dst_offset, src, src_offset, len) {
    _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGORPB5ArrayGRP310monkeyfist2mf4core2PtEEE(dst.buf, dst_offset, src.buf, src_offset, len);
  }
  function _M0MPC15array5Array12unsafe__blitGiE(dst, dst_offset, src, src_offset, len) {
    _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGiEE(dst.buf, dst_offset, src.buf, src_offset, len);
  }
  function _M0MPC15array5Array12unsafe__blitGRP310monkeyfist2mf4core2PtE(dst, dst_offset, src, src_offset, len) {
    _M0MPC15array10FixedArray12unsafe__blitGRPB17UnsafeMaybeUninitGUiRPC13ref3RefGiEEEE(dst.buf, dst_offset, src.buf, src_offset, len);
  }
  function _M0MPC15array5Array4makeGiE(len, elem) {
    const arr = _M0MPC15array5Array20unsafe__make__uninitGiE(len);
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < len) {
        arr.buf[i] = elem;
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return arr;
  }
  function _M0MPC15array5Array3popGAiE(self) {
    const len = self.len;
    if (len === 0) {
      return undefined;
    } else {
      const index = len - 1 | 0;
      const v = self.buf[index];
      self.len = index;
      return v;
    }
  }
  function _M0MPC15array5Array3popGiE(self) {
    const len = self.len;
    if (len === 0) {
      return undefined;
    } else {
      const index = len - 1 | 0;
      const v = self.buf[index];
      self.len = index;
      return v;
    }
  }
  function _M0MPC15array5Array4copyGORPB5ArrayGRP310monkeyfist2mf4core2PtEE(self) {
    const len = self.len;
    if (len === 0) {
      return new _M0TPB5ArrayGORPB5ArrayGRP310monkeyfist2mf4core2PtEE([], 0);
    }
    const arr = _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(len);
    _M0MPC15array5Array12unsafe__blitGORPB5ArrayGRP310monkeyfist2mf4core2PtEE(arr, 0, self, 0, len);
    return arr;
  }
  function _M0MPC15array5Array4copyGiE(self) {
    const len = self.len;
    if (len === 0) {
      return new _M0TPB5ArrayGiE([], 0);
    }
    const arr = _M0MPC15array5Array20unsafe__make__uninitGiE(len);
    _M0MPC15array5Array12unsafe__blitGiE(arr, 0, self, 0, len);
    return arr;
  }
  function _M0MPC15array5Array4copyGRP310monkeyfist2mf4core2PtE(self) {
    const len = self.len;
    if (len === 0) {
      return new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
    }
    const arr = _M0MPC15array5Array20unsafe__make__uninitGAiE(len);
    _M0MPC15array5Array12unsafe__blitGRP310monkeyfist2mf4core2PtE(arr, 0, self, 0, len);
    return arr;
  }
  function _M0MPC15array5Array5clearGiE(self) {
    _M0MPC15array5Array28unsafe__truncate__to__lengthGiE(self, 0);
  }
  function _M0MPC15array5Array5clearGdE(self) {
    _M0MPC15array5Array28unsafe__truncate__to__lengthGdE(self, 0);
  }
  function _M0MPC15array5Array14rev__in__placeGiE(self) {
    const len = self.len;
    const _bind = len / 2 | 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const temp = self.buf[i];
        const _bind$2 = (len - i | 0) - 1 | 0;
        const _bind$3 = self.buf[_bind$2];
        self.buf[i] = _bind$3;
        const _bind$4 = (len - i | 0) - 1 | 0;
        self.buf[_bind$4] = temp;
        _tmp = i + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0MPC15array5Array14rev__in__placeGRP310monkeyfist2mf4core2PtE(self) {
    const len = self.len;
    const _bind = len / 2 | 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const temp = self.buf[i];
        const _bind$2 = (len - i | 0) - 1 | 0;
        const _bind$3 = self.buf[_bind$2];
        self.buf[i] = _bind$3;
        const _bind$4 = (len - i | 0) - 1 | 0;
        self.buf[_bind$4] = temp;
        _tmp = i + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0MPC15array5Array3revGRP310monkeyfist2mf4core2PtE(self) {
    const len = self.len;
    const arr = _M0MPC15array5Array20unsafe__make__uninitGAiE(len);
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < len) {
        const _bind = (len - i | 0) - 1 | 0;
        const _bind$2 = self.buf[_bind];
        arr.buf[i] = _bind$2;
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return arr;
  }
  function _M0MPC15array5Array8containsGiE(self, value) {
    const _bind = self.len;
    const _bind$2 = self.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const v = _bind$2[_];
        if (v === value) {
          return true;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        return false;
      }
    }
  }
  function _M0MPC15array5Array8containsGsE(self, value) {
    const _bind = self.len;
    const _bind$2 = self.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const v = _bind$2[_];
        if (v === value) {
          return true;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        return false;
      }
    }
  }
  function _M0MPC15array5Array4joinGsE(self, separator) {
    return _M0MPC15array9ArrayView4joinGsE(new _M0TPB9ArrayViewGsE(self.buf, 0, self.len), separator);
  }
  function _M0FPC14math13math__pow__js(_tmp, _tmp$2) {
    return Math.pow(_tmp, _tmp$2);
  }
  function _M0FPC14math3pow(base, exponent) {
    if (base === 1) {
      return 1;
    }
    if (base === -1 && (exponent === _M0FPC16double8infinity || exponent === _M0FPC16double13neg__infinity)) {
      return 1;
    }
    return _M0FPC14math13math__pow__js(base, exponent);
  }
  function _M0FPC13set8new__setGsE(capacity) {
    const capacity$2 = _M0MPC13int3Int20next__power__of__two(capacity);
    const _bind = capacity$2 - 1 | 0;
    const _bind$2 = (Math.imul(capacity$2, 13) | 0) / 16 | 0;
    const _bind$3 = $make_array_len_and_init(capacity$2, undefined);
    const _bind$4 = undefined;
    return new _M0TPC13set3SetGsE(_bind$3, 0, capacity$2, _bind, _bind$2, _bind$4, -1);
  }
  function _M0FPC13set21capacity__for__length(length) {
    let capacity = _M0MPC13int3Int20next__power__of__two(length);
    const _p = capacity;
    if (length > ((Math.imul(_p, 13) | 0) / 16 | 0)) {
      capacity = Math.imul(capacity, 2) | 0;
    }
    return capacity;
  }
  function _M0MPC13set3Set20add__entry__to__tailGsE(self, idx, entry) {
    const _bind = self.tail;
    if (_bind === -1) {
      self.head = entry;
    } else {
      const _tmp = self.entries;
      const _p = _bind >>> 0 < _tmp.length ? _tmp[_bind] : $oob();
      let _tmp$2;
      if (_p === undefined) {
        _tmp$2 = $panic();
      } else {
        const _p$2 = _p;
        _tmp$2 = _p$2;
      }
      _tmp$2.next = entry;
    }
    self.tail = idx;
    self.entries[idx] = entry;
    self.size = self.size + 1 | 0;
  }
  function _M0MPC13set3Set10set__entryGsE(self, entry, new_idx) {
    const _bind = entry.next;
    if (_bind === undefined) {
      self.tail = new_idx;
    } else {
      const _Some = _bind;
      const _next = _Some;
      _next.prev = new_idx;
    }
    self.entries[new_idx] = entry;
  }
  function _M0MPC13set3Set10push__awayGsE(self, idx, entry) {
    let _tmp = entry.psl + 1 | 0;
    let _tmp$2 = idx + 1 & self.capacity_mask;
    let _tmp$3 = entry;
    while (true) {
      const psl = _tmp;
      const idx$2 = _tmp$2;
      const entry$2 = _tmp$3;
      const _bind = self.entries[idx$2];
      if (_bind === undefined) {
        entry$2.psl = psl;
        _M0MPC13set3Set10set__entryGsE(self, entry$2, idx$2);
        return;
      } else {
        const _Some = _bind;
        const _curr_entry = _Some;
        if (psl > _curr_entry.psl) {
          entry$2.psl = psl;
          _M0MPC13set3Set10set__entryGsE(self, entry$2, idx$2);
          _tmp = _curr_entry.psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          _tmp$3 = _curr_entry;
          continue;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPC13set3Set20rehash__place__entryGsE(self, outer) {
    const hash = outer.hash;
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const psl = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        outer.psl = psl;
        outer.prev = self.tail;
        _M0MPC13set3Set20add__entry__to__tailGsE(self, idx, outer);
        return undefined;
      } else {
        const _Some = _bind;
        const _curr = _Some;
        if (psl > _curr.psl) {
          _M0MPC13set3Set10push__awayGsE(self, idx, _curr);
          outer.psl = psl;
          outer.prev = self.tail;
          _M0MPC13set3Set20add__entry__to__tailGsE(self, idx, outer);
          return undefined;
        } else {
          _tmp = psl + 1 | 0;
          _tmp$2 = idx + 1 & self.capacity_mask;
          continue;
        }
      }
    }
  }
  function _M0MPC13set3Set4growGsE(self) {
    const old_head = self.head;
    const new_capacity = self.capacity << 1;
    self.entries = $make_array_len_and_init(new_capacity, undefined);
    self.capacity = new_capacity;
    self.capacity_mask = new_capacity - 1 | 0;
    const _p = self.capacity;
    self.grow_at = (Math.imul(_p, 13) | 0) / 16 | 0;
    self.size = 0;
    self.head = undefined;
    self.tail = -1;
    let _tmp = old_head;
    while (true) {
      const x = _tmp;
      if (x === undefined) {
        return;
      } else {
        const _Some = x;
        const _e = _Some;
        const next_in_chain = _e.next;
        _e.next = undefined;
        _M0MPC13set3Set20rehash__place__entryGsE(self, _e);
        _tmp = next_in_chain;
        continue;
      }
    }
  }
  function _M0MPC13set3Set15add__with__hashGsE(self, key, hash) {
    if (self.size >= self.grow_at) {
      _M0MPC13set3Set4growGsE(self);
    }
    let idx;
    let psl;
    _L: {
      let _tmp = 0;
      let _tmp$2 = hash & self.capacity_mask;
      while (true) {
        const psl$2 = _tmp;
        const idx$2 = _tmp$2;
        const _bind = self.entries[idx$2];
        if (_bind === undefined) {
          idx = idx$2;
          psl = psl$2;
          break _L;
        } else {
          const _Some = _bind;
          const _curr_entry = _Some;
          if (_curr_entry.hash === hash && _curr_entry.key === key) {
            return undefined;
          }
          if (psl$2 > _curr_entry.psl) {
            _M0MPC13set3Set10push__awayGsE(self, idx$2, _curr_entry);
            idx = idx$2;
            psl = psl$2;
            break _L;
          }
          _tmp = psl$2 + 1 | 0;
          _tmp$2 = idx$2 + 1 & self.capacity_mask;
          continue;
        }
      }
    }
    const _bind = self.tail;
    const _bind$2 = undefined;
    const entry = new _M0TPC13set5EntryGsE(_bind, _bind$2, psl, hash, key);
    _M0MPC13set3Set20add__entry__to__tailGsE(self, idx, entry);
  }
  function _M0MPC13set3Set3addGsE(self, key) {
    _M0MPC13set3Set15add__with__hashGsE(self, key, _M0IPC16string6StringPB4Hash4hash(key));
  }
  function _M0MPC13set3Set3SetGsE(arr, capacity) {
    const length = arr.end - arr.start | 0;
    let capacity$2;
    if (capacity === undefined) {
      capacity$2 = length === 0 ? 8 : _M0FPC13set21capacity__for__length(length);
    } else {
      const _Some = capacity;
      const _capacity = _Some;
      const _p = _M0FPC13set21capacity__for__length(length);
      capacity$2 = _capacity > _p ? _capacity : _p;
    }
    const m = _M0FPC13set8new__setGsE(capacity$2);
    const _bind = arr.end - arr.start | 0;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const e = arr.buf[arr.start + _ | 0];
        _M0MPC13set3Set3addGsE(m, e);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return m;
  }
  function _M0MPC13set3Set20contains__with__hashGsE(self, key, hash) {
    let _tmp = 0;
    let _tmp$2 = hash & self.capacity_mask;
    while (true) {
      const i = _tmp;
      const idx = _tmp$2;
      const _bind = self.entries[idx];
      if (_bind === undefined) {
        return false;
      } else {
        const _Some = _bind;
        const _entry = _Some;
        if (_entry.hash === hash && _entry.key === key) {
          return true;
        }
        if (i > _entry.psl) {
          return false;
        }
        _tmp = i + 1 | 0;
        _tmp$2 = idx + 1 & self.capacity_mask;
        continue;
      }
    }
  }
  function _M0MPC13set3Set8containsGsE(self, key) {
    return _M0MPC13set3Set20contains__with__hashGsE(self, key, _M0IPC16string6StringPB4Hash4hash(key));
  }
  function _M0FP310monkeyfist2mf4core9js__round(x) {
    const f = _M0MPC16double6Double5floor(x);
    return x - f >= 0.5 ? _M0MPC16double6Double7to__int(f) + 1 | 0 : _M0MPC16double6Double7to__int(f);
  }
  function _M0FP310monkeyfist2mf4core13knots__wanted(d) {
    return d < 12 ? 0 : _M0FP310monkeyfist2mf4core9js__round(0.6 * Math.sqrt(d));
  }
  function _M0MP310monkeyfist2mf4core5Style7len__hi(self, w) {
    const _bind = self.name;
    switch (_bind) {
      case "short": {
        return 5;
      }
      case "medium": {
        return 8;
      }
      default: {
        return 8 > w ? 8 : w;
      }
    }
  }
  function _M0MP310monkeyfist2mf4core10Intentions3new(w, h, mirrors) {
    const n = Math.imul(w, h) | 0;
    const b = new _M0TP310monkeyfist2mf4core7SqBoard(0, 0, $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0), new _M0TPB5ArrayGAiE([], 0), $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0));
    return new _M0TP310monkeyfist2mf4core10Intentions(w, h, mirrors, b, new _M0TPB5ArrayGRPB5ArrayGRP310monkeyfist2mf4core2PtEE([], 0), new _M0TPB5ArrayGRPB5ArrayGiEE([], 0), $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0), new _M0TPB5ArrayGiE([], 0), 0);
  }
  function _M0FP310monkeyfist2mf4core9head__dir(path) {
    const _bind = path.len - 1 | 0;
    if (_bind < 0 || _bind >= path.len) {
      $panic();
    }
    const h = path.buf[_bind];
    const _bind$2 = path.len - 2 | 0;
    if (_bind$2 < 0 || _bind$2 >= path.len) {
      $panic();
    }
    const p = path.buf[_bind$2];
    return { _0: h.q - p.q | 0, _1: h.r - p.r | 0 };
  }
  function _M0FP310monkeyfist2mf4core4last(p) {
    const _bind = p.len - 1 | 0;
    if (_bind < 0 || _bind >= p.len) {
      $panic();
    }
    return p.buf[_bind];
  }
  function _M0FP310monkeyfist2mf4core11next__stamp(size) {
    while (true) {
      if (_M0FP310monkeyfist2mf4core5marks.len < size) {
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf4core5marks, 0);
        continue;
      } else {
        break;
      }
    }
    _M0FP310monkeyfist2mf4core11mark__stamp.val = _M0FP310monkeyfist2mf4core11mark__stamp.val + 1 | 0;
    return _M0FP310monkeyfist2mf4core11mark__stamp.val;
  }
  function _M0FP310monkeyfist2mf4core8has__dup(out, start) {
    let top = 0;
    const _bind = out.len;
    let _tmp = start;
    while (true) {
      const k = _tmp;
      if (k < _bind) {
        const _p = top;
        if (k < 0 || k >= out.len) {
          $panic();
        }
        const _p$2 = out.buf[k] + 1 | 0;
        top = _p > _p$2 ? _p : _p$2;
        _tmp = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const s = _M0FP310monkeyfist2mf4core11next__stamp(top);
    const _bind$2 = out.len;
    let _tmp$2 = start;
    while (true) {
      const k = _tmp$2;
      if (k < _bind$2) {
        if (k < 0 || k >= out.len) {
          $panic();
        }
        const c = out.buf[k];
        if (c < 0 || c >= _M0FP310monkeyfist2mf4core5marks.len) {
          $panic();
        }
        if (_M0FP310monkeyfist2mf4core5marks.buf[c] === s) {
          return true;
        }
        if (c < 0 || c >= _M0FP310monkeyfist2mf4core5marks.len) {
          $panic();
        }
        _M0FP310monkeyfist2mf4core5marks.buf[c] = s;
        _tmp$2 = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0FP310monkeyfist2mf4core4turn(s, dx, dy) {
    return s === 0 ? { _0: -dy | 0, _1: -dx | 0 } : { _0: dy, _1: dx };
  }
  function _M0MP310monkeyfist2mf4core9SqMirrors3get(self, c) {
    if (c >= 0 && c < self.slope.length) {
      const _tmp = self.slope;
      return c >>> 0 < _tmp.length ? _tmp[c] : $oob();
    } else {
      return -1;
    }
  }
  function _M0FP310monkeyfist2mf4core10ray__cells(x0, y0, dx0, dy0, w, h, m, out) {
    const start = out.len;
    let turned = false;
    let x = x0;
    let y = y0;
    let dx = dx0;
    let dy = dy0;
    while (true) {
      x = x + dx | 0;
      y = y + dy | 0;
      if (x < 0 || (y < 0 || (x >= w || y >= h))) {
        break;
      }
      const c = (Math.imul(y, w) | 0) + x | 0;
      const s = _M0MP310monkeyfist2mf4core9SqMirrors3get(m, c);
      _M0MPC15array5Array4pushGiE(out, c);
      if (s >= 0) {
        const _bind = _M0FP310monkeyfist2mf4core4turn(s, dx, dy);
        const _a = _bind._0;
        const _b = _bind._1;
        dx = _a;
        dy = _b;
        turned = true;
        if ((out.len - start | 0) > (Math.imul(Math.imul(2, w) | 0, h) | 0)) {
          return false;
        }
      }
      continue;
    }
    return !(turned && _M0FP310monkeyfist2mf4core8has__dup(out, start));
  }
  function _M0MP310monkeyfist2mf4core10Intentions3add(self, path, st) {
    const b = self.b;
    const hd = _M0FP310monkeyfist2mf4core4last(path);
    const _bind = _M0FP310monkeyfist2mf4core9head__dir(path);
    const _dx = _bind._0;
    const _dy = _bind._1;
    const w = self.w;
    const h = self.h;
    const _p = _M0MPC15array5Array20unsafe__make__uninitGiE(path.len);
    const _p$2 = path.len;
    const _p$3 = path.buf;
    let _tmp = 0;
    while (true) {
      const _p$4 = _tmp;
      if (_p$4 < _p$2) {
        const _p$5 = _p$3[_p$4];
        const _p$6 = (Math.imul(_p$5.r, w) | 0) + _p$5.q | 0;
        _p.buf[_p$4] = _p$6;
        _tmp = _p$4 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const q = _p;
    const _p$4 = self.mirrors;
    if (_p$4.keys.len > 0) {
      if (!_M0FP310monkeyfist2mf4core10ray__cells(hd.q, hd.r, _dx, _dy, w, h, self.mirrors, q)) {
        $panic("Unchecked looping track");
      }
    } else {
      let x = hd.q + _dx | 0;
      let y = hd.r + _dy | 0;
      while (true) {
        if (x >= 0 && (y >= 0 && (x < w && y < h))) {
          _M0MPC15array5Array4pushGiE(q, (Math.imul(y, w) | 0) + x | 0);
          x = x + _dx | 0;
          y = y + _dy | 0;
          continue;
        } else {
          break;
        }
      }
    }
    _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(b.seq, _M0MPC15array10FixedArray11from__arrayGiE(new _M0TPB9ArrayViewGiE(q.buf, 0, q.len)));
    const _tmp$2 = b.len;
    const _tmp$3 = b.n;
    if (_tmp$3 >>> 0 < _tmp$2.length) {
      _tmp$2[_tmp$3] = path.len;
    } else {
      $oob();
    }
    _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(self.paths, path);
    _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(self.stops, st);
    b.n = b.n + 1 | 0;
    return b.n - 1 | 0;
  }
  function _M0MP310monkeyfist2mf4core10Intentions4drop(self) {
    const _bind = self.b;
    _bind.n = _bind.n - 1 | 0;
    _M0MPC15array5Array3popGAiE(self.b.seq);
    _M0MPC15array5Array3popGAiE(self.paths);
    _M0MPC15array5Array3popGAiE(self.stops);
  }
  function _M0MP310monkeyfist2mf4core7SqBoard5place(b, i, to) {
    const _bind = b.seq;
    if (i < 0 || i >= _bind.len) {
      $panic();
    }
    const s = _bind.buf[i];
    const _tmp = b.len;
    const l = i >>> 0 < _tmp.length ? _tmp[i] : $oob();
    const _tmp$2 = b.off;
    const from = i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob();
    if (from >= 0) {
      const _bind$2 = from + l | 0;
      let _tmp$3 = from;
      while (true) {
        const p = _tmp$3;
        if (p < _bind$2) {
          const _tmp$4 = b.occ;
          const _tmp$5 = p >>> 0 < s.length ? s[p] : $oob();
          if (_tmp$5 >>> 0 < _tmp$4.length) {
            _tmp$4[_tmp$5] = -1;
          } else {
            $oob();
          }
          _tmp$3 = p + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      b.left = b.left - 1 | 0;
    }
    if (to >= 0) {
      const _bind$2 = to + l | 0;
      let _tmp$3 = to;
      while (true) {
        const p = _tmp$3;
        if (p < _bind$2) {
          const _tmp$4 = b.occ;
          const _tmp$5 = p >>> 0 < s.length ? s[p] : $oob();
          if (_tmp$5 >>> 0 < _tmp$4.length) {
            _tmp$4[_tmp$5] = i;
          } else {
            $oob();
          }
          const _tmp$6 = b.at;
          const _tmp$7 = p >>> 0 < s.length ? s[p] : $oob();
          if (_tmp$7 >>> 0 < _tmp$6.length) {
            _tmp$6[_tmp$7] = p;
          } else {
            $oob();
          }
          _tmp$3 = p + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      b.left = b.left + 1 | 0;
    }
    const _tmp$3 = b.off;
    if (i >>> 0 < _tmp$3.length) {
      _tmp$3[i] = to;
    } else {
      $oob();
    }
  }
  function _M0MP310monkeyfist2mf4core10Intentions7set__up(self) {
    const b = self.b;
    _M0MPC15array10FixedArray12fill_2einnerGiE(b.occ, -1, 0, undefined);
    b.left = 0;
    const _bind = b.n;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const _tmp$2 = b.off;
        if (i >>> 0 < _tmp$2.length) {
          _tmp$2[i] = -1;
        } else {
          $oob();
        }
        _M0MP310monkeyfist2mf4core7SqBoard5place(b, i, 0);
        _tmp = i + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0MP310monkeyfist2mf4core10Intentions3tap(self, i) {
    const b = self.b;
    const _bind = b.seq;
    if (i < 0 || i >= _bind.len) {
      $panic();
    }
    const q = _bind.buf[i];
    const _tmp = b.len;
    const l = i >>> 0 < _tmp.length ? _tmp[i] : $oob();
    const _tmp$2 = b.off;
    const from = i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob();
    let p = from + l | 0;
    const _tmp$3 = self.rope_at;
    let lay = i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob();
    let by = -1;
    while (true) {
      let _tmp$4;
      if (p < q.length) {
        const _tmp$5 = b.occ;
        const _tmp$6 = p;
        const _tmp$7 = _tmp$6 >>> 0 < q.length ? q[_tmp$6] : $oob();
        _tmp$4 = (_tmp$7 >>> 0 < _tmp$5.length ? _tmp$5[_tmp$7] : $oob()) === -1;
      } else {
        _tmp$4 = false;
      }
      if (_tmp$4) {
        const _tmp$5 = self.cell_at;
        const _tmp$6 = p;
        const _tmp$7 = _tmp$6 >>> 0 < q.length ? q[_tmp$6] : $oob();
        if ((_tmp$7 >>> 0 < _tmp$5.length ? _tmp$5[_tmp$7] : $oob()) > lay) {
          const _tmp$8 = self.cell_at;
          const _tmp$9 = p;
          const _tmp$10 = _tmp$9 >>> 0 < q.length ? q[_tmp$9] : $oob();
          lay = _tmp$10 >>> 0 < _tmp$8.length ? _tmp$8[_tmp$10] : $oob();
          const _tmp$11 = self.cell_by;
          const _tmp$12 = p;
          const _tmp$13 = _tmp$12 >>> 0 < q.length ? q[_tmp$12] : $oob();
          by = _tmp$13 >>> 0 < _tmp$11.length ? _tmp$11[_tmp$13] : $oob();
        }
        p = p + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const to = p === q.length ? -1 : p - l | 0;
    const _bind$2 = self.stops;
    if (i < 0 || i >= _bind$2.len) {
      $panic();
    }
    const st = _bind$2.buf[i];
    let want;
    const _tmp$4 = self.done;
    if ((i >>> 0 < _tmp$4.length ? _tmp$4[i] : $oob()) < st.len) {
      const _tmp$5 = self.done;
      const _bind$3 = i >>> 0 < _tmp$5.length ? _tmp$5[i] : $oob();
      if (_bind$3 < 0 || _bind$3 >= st.len) {
        $panic();
      }
      want = st.buf[_bind$3];
    } else {
      want = -1;
    }
    if (to !== want) {
      return false;
    }
    if (to >= 0) {
      const _tmp$5 = b.occ;
      const _tmp$6 = p;
      const _tmp$7 = _tmp$6 >>> 0 < q.length ? q[_tmp$6] : $oob();
      const z = _tmp$7 >>> 0 < _tmp$5.length ? _tmp$5[_tmp$7] : $oob();
      const _tmp$8 = self.rope_at;
      if ((z >>> 0 < _tmp$8.length ? _tmp$8[z] : $oob()) > lay) {
        const _tmp$9 = self.rope_at;
        lay = z >>> 0 < _tmp$9.length ? _tmp$9[z] : $oob();
        by = z;
      }
    }
    lay = lay + 1 | 0;
    let end;
    if (to < 0) {
      end = from + l | 0;
    } else {
      const _p = from + l | 0;
      end = _p < to ? _p : to;
    }
    let _tmp$5 = from;
    while (true) {
      const c = _tmp$5;
      if (c < end) {
        const _tmp$6 = self.cell_at;
        const _tmp$7 = c >>> 0 < q.length ? q[c] : $oob();
        if (_tmp$7 >>> 0 < _tmp$6.length) {
          _tmp$6[_tmp$7] = lay;
        } else {
          $oob();
        }
        const _tmp$8 = self.cell_by;
        const _tmp$9 = c >>> 0 < q.length ? q[c] : $oob();
        if (_tmp$9 >>> 0 < _tmp$8.length) {
          _tmp$8[_tmp$9] = i;
        } else {
          $oob();
        }
        _tmp$5 = c + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MP310monkeyfist2mf4core7SqBoard5place(b, i, to);
    const _tmp$6 = self.rope_at;
    if (i >>> 0 < _tmp$6.length) {
      _tmp$6[i] = lay;
    } else {
      $oob();
    }
    _M0MPC15array5Array4pushGiE(self.taps, i);
    if (to < 0) {
      const _tmp$7 = self.cost;
      if (i >>> 0 < _tmp$7.length) {
        _tmp$7[i] = lay;
      } else {
        $oob();
      }
      const _tmp$8 = self.dep;
      if (i >>> 0 < _tmp$8.length) {
        _tmp$8[i] = by;
      } else {
        $oob();
      }
      self.cost_sum = self.cost_sum + lay | 0;
    } else {
      const _array_1 = self.done;
      if (i >>> 0 < _array_1.length) {
        _array_1[i] = (i >>> 0 < _array_1.length ? _array_1[i] : $oob()) + 1 | 0;
      } else {
        $oob();
      }
    }
    return true;
  }
  function _M0MP310monkeyfist2mf4core10Intentions6replay(self, list, fresh) {
    const b = self.b;
    _M0MP310monkeyfist2mf4core10Intentions7set__up(self);
    _M0MPC15array10FixedArray12fill_2einnerGiE(self.cell_at, -1, 0, undefined);
    const _bind = b.n;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const _tmp$2 = self.rope_at;
        if (i >>> 0 < _tmp$2.length) {
          _tmp$2[i] = -1;
        } else {
          $oob();
        }
        const _tmp$3 = self.done;
        if (i >>> 0 < _tmp$3.length) {
          _tmp$3[i] = 0;
        } else {
          $oob();
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    self.taps = new _M0TPB5ArrayGiE([], 0);
    self.cost_sum = 0;
    let moved = true;
    while (true) {
      if (moved && b.left > 0) {
        moved = false;
        const _bind$2 = list.len;
        const _bind$3 = list.buf;
        let _tmp$2 = 0;
        while (true) {
          const _ = _tmp$2;
          if (_ < _bind$2) {
            const i = _bind$3[_];
            let _tmp$3;
            const _tmp$4 = b.off;
            if ((i >>> 0 < _tmp$4.length ? _tmp$4[i] : $oob()) >= 0) {
              _tmp$3 = _M0MP310monkeyfist2mf4core10Intentions3tap(self, i);
            } else {
              _tmp$3 = false;
            }
            if (_tmp$3) {
              moved = true;
              while (true) {
                let _tmp$5;
                if (fresh >= 0) {
                  let _tmp$6;
                  const _tmp$7 = b.off;
                  if ((fresh >>> 0 < _tmp$7.length ? _tmp$7[fresh] : $oob()) >= 0) {
                    _tmp$6 = _M0MP310monkeyfist2mf4core10Intentions3tap(self, fresh);
                  } else {
                    _tmp$6 = false;
                  }
                  _tmp$5 = _tmp$6;
                } else {
                  _tmp$5 = false;
                }
                if (_tmp$5) {
                  continue;
                } else {
                  break;
                }
              }
            }
            _tmp$2 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        continue;
      } else {
        break;
      }
    }
    return b.left === 0;
  }
  function _M0MP310monkeyfist2mf4core10Intentions5trial(self, path, st, order) {
    const id = _M0MP310monkeyfist2mf4core10Intentions3add(self, path, st);
    const list = new _M0TPB5ArrayGiE([id], 1);
    const _bind = order.len;
    const _bind$2 = order.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const x = _bind$2[_];
        _M0MPC15array5Array4pushGiE(list, x);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const ok = _M0MP310monkeyfist2mf4core10Intentions6replay(self, list, id);
    const sum = self.cost_sum;
    _M0MP310monkeyfist2mf4core10Intentions4drop(self);
    return ok ? sum : -1;
  }
  function _M0FP310monkeyfist2mf4core11knot__spots(occ, rest, w, h, mirrors, pull) {
    const tight = new _M0TPB5ArrayGRP310monkeyfist2mf4core4SpotE([], 0);
    const chain = new _M0TPB5ArrayGRP310monkeyfist2mf4core4SpotE([], 0);
    const gapped = new _M0TPB5ArrayGRP310monkeyfist2mf4core4SpotE([], 0);
    const _bind = Math.imul(w, h) | 0;
    let _tmp = 0;
    while (true) {
      const c = _tmp;
      if (c < _bind) {
        _L: {
          if ((c >>> 0 < occ.length ? occ[c] : $oob()) !== -1) {
            break _L;
          }
          const x = c % w | 0;
          const y = c / w | 0;
          let _tmp$2 = 0;
          while (true) {
            const di = _tmp$2;
            if (di < 4) {
              _L$2: {
                const dx = di >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[di] : $oob();
                const dy = di >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[di] : $oob();
                const ax = x + dx | 0;
                const ay = y + dy | 0;
                if (ax < 0 || (ay < 0 || (ax >= w || ay >= h))) {
                  break _L$2;
                }
                const _tmp$3 = (Math.imul(ay, w) | 0) + ax | 0;
                const o = _tmp$3 >>> 0 < occ.length ? occ[_tmp$3] : $oob();
                let against;
                if (o === -1) {
                  const _tmp$4 = (Math.imul(ay, w) | 0) + ax | 0;
                  against = _tmp$4 >>> 0 < rest.length ? rest[_tmp$4] : $oob();
                } else {
                  against = -1;
                }
                if (o >= 0 || against >= 0) {
                  let room = 0;
                  let bx = x - dx | 0;
                  let by = y - dy | 0;
                  while (true) {
                    let _tmp$4;
                    if (room <= pull) {
                      let _tmp$5;
                      if (bx >= 0) {
                        let _tmp$6;
                        if (by >= 0) {
                          let _tmp$7;
                          if (bx < w) {
                            let _tmp$8;
                            if (by < h) {
                              const _tmp$9 = (Math.imul(by, w) | 0) + bx | 0;
                              _tmp$8 = (_tmp$9 >>> 0 < occ.length ? occ[_tmp$9] : $oob()) === -1;
                            } else {
                              _tmp$8 = false;
                            }
                            _tmp$7 = _tmp$8;
                          } else {
                            _tmp$7 = false;
                          }
                          _tmp$6 = _tmp$7;
                        } else {
                          _tmp$6 = false;
                        }
                        _tmp$5 = _tmp$6;
                      } else {
                        _tmp$5 = false;
                      }
                      _tmp$4 = _tmp$5;
                    } else {
                      _tmp$4 = false;
                    }
                    if (_tmp$4) {
                      room = room + 1 | 0;
                      bx = bx - dx | 0;
                      by = by - dy | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  if (room >= 2) {
                    const s = new _M0TP310monkeyfist2mf4core4Spot(c, di, room, against, 0);
                    if (o >= 0) {
                      _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(tight, s);
                    } else {
                      _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(chain, s);
                    }
                  }
                  break _L$2;
                }
                if (mirrors.keys.len > 0) {
                  const ahead = new _M0TPB5ArrayGiE([], 0);
                  if (!_M0FP310monkeyfist2mf4core10ray__cells(x, y, dx, dy, w, h, mirrors, ahead)) {
                    break _L$2;
                  }
                  let gap = 0;
                  while (true) {
                    let _tmp$4;
                    if (gap < ahead.len) {
                      let _tmp$5;
                      if (gap <= pull) {
                        let _tmp$6;
                        const _bind$2 = gap;
                        if (_bind$2 < 0 || _bind$2 >= ahead.len) {
                          $panic();
                        }
                        const _tmp$7 = ahead.buf[_bind$2];
                        if ((_tmp$7 >>> 0 < occ.length ? occ[_tmp$7] : $oob()) === -1) {
                          _tmp$6 = true;
                        } else {
                          const _bind$3 = gap;
                          if (_bind$3 < 0 || _bind$3 >= ahead.len) {
                            $panic();
                          }
                          const _tmp$8 = ahead.buf[_bind$3];
                          _tmp$6 = (_tmp$8 >>> 0 < occ.length ? occ[_tmp$8] : $oob()) === -4;
                        }
                        _tmp$5 = _tmp$6;
                      } else {
                        _tmp$5 = false;
                      }
                      _tmp$4 = _tmp$5;
                    } else {
                      _tmp$4 = false;
                    }
                    if (_tmp$4) {
                      gap = gap + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  let _tmp$4;
                  if (gap > 0) {
                    let _tmp$5;
                    if (gap <= pull) {
                      let _tmp$6;
                      if (gap < ahead.len) {
                        const _bind$2 = gap;
                        if (_bind$2 < 0 || _bind$2 >= ahead.len) {
                          $panic();
                        }
                        const _tmp$7 = ahead.buf[_bind$2];
                        _tmp$6 = (_tmp$7 >>> 0 < occ.length ? occ[_tmp$7] : $oob()) >= 0;
                      } else {
                        _tmp$6 = false;
                      }
                      _tmp$5 = _tmp$6;
                    } else {
                      _tmp$5 = false;
                    }
                    _tmp$4 = _tmp$5;
                  } else {
                    _tmp$4 = false;
                  }
                  if (_tmp$4) {
                    _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(gapped, new _M0TP310monkeyfist2mf4core4Spot(c, di, 0, -1, gap));
                  }
                  break _L$2;
                }
                let gap = 0;
                let nx = ax;
                let ny = ay;
                while (true) {
                  let _tmp$4;
                  if (gap <= pull) {
                    let _tmp$5;
                    if (nx >= 0) {
                      let _tmp$6;
                      if (ny >= 0) {
                        let _tmp$7;
                        if (nx < w) {
                          let _tmp$8;
                          if (ny < h) {
                            const _tmp$9 = (Math.imul(ny, w) | 0) + nx | 0;
                            _tmp$8 = (_tmp$9 >>> 0 < occ.length ? occ[_tmp$9] : $oob()) === -1;
                          } else {
                            _tmp$8 = false;
                          }
                          _tmp$7 = _tmp$8;
                        } else {
                          _tmp$7 = false;
                        }
                        _tmp$6 = _tmp$7;
                      } else {
                        _tmp$6 = false;
                      }
                      _tmp$5 = _tmp$6;
                    } else {
                      _tmp$5 = false;
                    }
                    _tmp$4 = _tmp$5;
                  } else {
                    _tmp$4 = false;
                  }
                  if (_tmp$4) {
                    gap = gap + 1 | 0;
                    nx = nx + dx | 0;
                    ny = ny + dy | 0;
                    continue;
                  } else {
                    break;
                  }
                }
                let _tmp$4;
                if (gap > 0) {
                  let _tmp$5;
                  if (gap <= pull) {
                    let _tmp$6;
                    if (nx >= 0) {
                      let _tmp$7;
                      if (ny >= 0) {
                        let _tmp$8;
                        if (nx < w) {
                          let _tmp$9;
                          if (ny < h) {
                            const _tmp$10 = (Math.imul(ny, w) | 0) + nx | 0;
                            _tmp$9 = (_tmp$10 >>> 0 < occ.length ? occ[_tmp$10] : $oob()) >= 0;
                          } else {
                            _tmp$9 = false;
                          }
                          _tmp$8 = _tmp$9;
                        } else {
                          _tmp$8 = false;
                        }
                        _tmp$7 = _tmp$8;
                      } else {
                        _tmp$7 = false;
                      }
                      _tmp$6 = _tmp$7;
                    } else {
                      _tmp$6 = false;
                    }
                    _tmp$5 = _tmp$6;
                  } else {
                    _tmp$5 = false;
                  }
                  _tmp$4 = _tmp$5;
                } else {
                  _tmp$4 = false;
                }
                if (_tmp$4) {
                  _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(gapped, new _M0TP310monkeyfist2mf4core4Spot(c, di, 0, -1, gap));
                }
                break _L$2;
              }
              _tmp$2 = di + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          break _L;
        }
        _tmp = c + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return { _0: tight, _1: chain, _2: gapped };
  }
  function _M0FP310monkeyfist2mf4core9bends__of(path) {
    let n = 0;
    const _bind = path.len;
    let _tmp = 2;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        let _tmp$2;
        if (i < 0 || i >= path.len) {
          $panic();
        }
        const _tmp$3 = path.buf[i].q;
        const _bind$2 = i - 1 | 0;
        if (_bind$2 < 0 || _bind$2 >= path.len) {
          $panic();
        }
        const _tmp$4 = _tmp$3 - path.buf[_bind$2].q | 0;
        const _bind$3 = i - 1 | 0;
        if (_bind$3 < 0 || _bind$3 >= path.len) {
          $panic();
        }
        const _tmp$5 = path.buf[_bind$3].q;
        const _bind$4 = i - 2 | 0;
        if (_bind$4 < 0 || _bind$4 >= path.len) {
          $panic();
        }
        if (_tmp$4 !== (_tmp$5 - path.buf[_bind$4].q | 0)) {
          _tmp$2 = true;
        } else {
          if (i < 0 || i >= path.len) {
            $panic();
          }
          const _tmp$6 = path.buf[i].r;
          const _bind$5 = i - 1 | 0;
          if (_bind$5 < 0 || _bind$5 >= path.len) {
            $panic();
          }
          const _tmp$7 = _tmp$6 - path.buf[_bind$5].r | 0;
          const _bind$6 = i - 1 | 0;
          if (_bind$6 < 0 || _bind$6 >= path.len) {
            $panic();
          }
          const _tmp$8 = path.buf[_bind$6].r;
          const _bind$7 = i - 2 | 0;
          if (_bind$7 < 0 || _bind$7 >= path.len) {
            $panic();
          }
          _tmp$2 = _tmp$7 !== (_tmp$8 - path.buf[_bind$7].r | 0);
        }
        if (_tmp$2) {
          n = n + 1 | 0;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return n;
  }
  function _M0FP310monkeyfist2mf4core11index__from(a, x, from) {
    const _bind = a.len;
    let _tmp = from;
    while (true) {
      const k = _tmp;
      if (k < _bind) {
        if (k < 0 || k >= a.len) {
          $panic();
        }
        if (a.buf[k] === x) {
          return k;
        }
        _tmp = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return -1;
  }
  function _M0FP310monkeyfist2mf4core8contains(a, x) {
    return _M0FP310monkeyfist2mf4core11index__from(a, x, 0) >= 0;
  }
  function _M0FP310monkeyfist2mf4core9all__gone(paths) {
    const _bind = paths.len;
    const _bind$2 = paths.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const p = _bind$2[_];
        if (p === undefined) {
        } else {
          return false;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return true;
  }
  function _M0FP310monkeyfist2mf4core11some__paths(ropes) {
    const _p = _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(ropes.len);
    const _p$2 = ropes.len;
    const _p$3 = ropes.buf;
    let _tmp = 0;
    while (true) {
      const _p$4 = _tmp;
      if (_p$4 < _p$2) {
        const _p$5 = _p$3[_p$4];
        const _p$6 = _p$5;
        _p.buf[_p$4] = _p$6;
        _tmp = _p$4 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return _p;
  }
  function _M0FP310monkeyfist2mf4core9exit__dir(path, w, m) {
    const h = _M0FP310monkeyfist2mf4core4last(path);
    const _bind = _M0FP310monkeyfist2mf4core9head__dir(path);
    const _dx = _bind._0;
    const _dy = _bind._1;
    const s = _M0MP310monkeyfist2mf4core9SqMirrors3get(m, (Math.imul(h.r, w) | 0) + h.q | 0);
    return s < 0 ? { _0: _dx, _1: _dy } : _M0FP310monkeyfist2mf4core4turn(s, _dx, _dy);
  }
  function _M0FP310monkeyfist2mf4core9sq__board(paths, w, h, m) {
    const n = paths.len;
    const occ = $make_array_len_and_init(Math.imul(w, h) | 0, -1);
    const at = $make_array_len_and_init(Math.imul(w, h) | 0, 0);
    const seq = new _M0TPB5ArrayGAiE([], 0);
    const len = $make_array_len_and_init(n, 0);
    const off = $make_array_len_and_init(n, -1);
    const bent = m.keys.len > 0;
    let left = 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < n) {
        if (i < 0 || i >= paths.len) {
          $panic();
        }
        const _bind = paths.buf[i];
        if (_bind === undefined) {
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(seq, $make_array_len_and_init(0, 0));
        } else {
          const _Some = _bind;
          const _path = _Some;
          const hd = _M0FP310monkeyfist2mf4core4last(_path);
          const _bind$2 = bent ? _M0FP310monkeyfist2mf4core9exit__dir(_path, w, m) : _M0FP310monkeyfist2mf4core9head__dir(_path);
          const _dx = _bind$2._0;
          const _dy = _bind$2._1;
          const _p = _M0MPC15array5Array20unsafe__make__uninitGiE(_path.len);
          const _p$2 = _path.len;
          const _p$3 = _path.buf;
          let _tmp$2 = 0;
          while (true) {
            const _p$4 = _tmp$2;
            if (_p$4 < _p$2) {
              const _p$5 = _p$3[_p$4];
              const _p$6 = (Math.imul(_p$5.r, w) | 0) + _p$5.q | 0;
              _p.buf[_p$4] = _p$6;
              _tmp$2 = _p$4 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const s = _p;
          if (bent) {
            if (!_M0FP310monkeyfist2mf4core10ray__cells(hd.q, hd.r, _dx, _dy, w, h, m, s)) {
              return undefined;
            }
          } else {
            let x = hd.q + _dx | 0;
            let y = hd.r + _dy | 0;
            while (true) {
              if (x >= 0 && (y >= 0 && (x < w && y < h))) {
                _M0MPC15array5Array4pushGiE(s, (Math.imul(y, w) | 0) + x | 0);
                x = x + _dx | 0;
                y = y + _dy | 0;
                continue;
              } else {
                break;
              }
            }
          }
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(seq, _M0MPC15array10FixedArray11from__arrayGiE(new _M0TPB9ArrayViewGiE(s.buf, 0, s.len)));
          if (i >>> 0 < len.length) {
            len[i] = _path.len;
          } else {
            $oob();
          }
          const _bind$3 = _path.len;
          let _tmp$3 = 0;
          while (true) {
            const j = _tmp$3;
            if (j < _bind$3) {
              if (j < 0 || j >= s.len) {
                $panic();
              }
              const _tmp$4 = s.buf[j];
              if (_tmp$4 >>> 0 < occ.length) {
                occ[_tmp$4] = i;
              } else {
                $oob();
              }
              if (j < 0 || j >= s.len) {
                $panic();
              }
              const _tmp$5 = s.buf[j];
              if (_tmp$5 >>> 0 < at.length) {
                at[_tmp$5] = j;
              } else {
                $oob();
              }
              _tmp$3 = j + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if (i >>> 0 < off.length) {
            off[i] = 0;
          } else {
            $oob();
          }
          left = left + 1 | 0;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core7SqBoard(n, left, occ, at, seq, len, off, $make_array_len_and_init(n, 0), $make_array_len_and_init(n, 0));
  }
  function _M0FP310monkeyfist2mf4core14sq__board__exn(paths, w, h, m) {
    const _bind = _M0FP310monkeyfist2mf4core9sq__board(paths, w, h, m);
    if (_bind === undefined) {
      return $panic("A rope's way out passes a cell twice");
    } else {
      const _Some = _bind;
      return _Some;
    }
  }
  function _M0FP310monkeyfist2mf4core10groups__of(blk) {
    const n = blk.len;
    const index = $make_array_len_and_init(n, -1);
    const low = $make_array_len_and_init(n, 0);
    const on = $make_array_len_and_init(n, false);
    const stack = new _M0TPB5ArrayGiE([], 0);
    const groups = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    let next = 0;
    let _tmp = 0;
    while (true) {
      const root = _tmp;
      if (root < n) {
        _L: {
          if ((root >>> 0 < index.length ? index[root] : $oob()) >= 0) {
            break _L;
          }
          const work = new _M0TPB5ArrayGUiRPC13ref3RefGiEEE([{ _0: root, _1: new _M0TPC13ref3RefGiE(0) }], 1);
          if (root >>> 0 < index.length) {
            index[root] = next;
          } else {
            $oob();
          }
          if (root >>> 0 < low.length) {
            low[root] = next;
          } else {
            $oob();
          }
          next = next + 1 | 0;
          _M0MPC15array5Array4pushGiE(stack, root);
          if (root >>> 0 < on.length) {
            on[root] = true;
          } else {
            $oob();
          }
          while (true) {
            if (work.len > 0) {
              const _bind = work.len - 1 | 0;
              if (_bind < 0 || _bind >= work.len) {
                $panic();
              }
              const _bind$2 = work.buf[_bind];
              const _v = _bind$2._0;
              const _pos = _bind$2._1;
              const _tmp$2 = _pos.val;
              if (_v < 0 || _v >= blk.len) {
                $panic();
              }
              if (_tmp$2 < blk.buf[_v].len) {
                if (_v < 0 || _v >= blk.len) {
                  $panic();
                }
                const _bind$3 = blk.buf[_v];
                const _bind$4 = _pos.val;
                if (_bind$4 < 0 || _bind$4 >= _bind$3.len) {
                  $panic();
                }
                const x = _bind$3.buf[_bind$4];
                _pos.val = _pos.val + 1 | 0;
                if ((x >>> 0 < index.length ? index[x] : $oob()) < 0) {
                  if (x >>> 0 < index.length) {
                    index[x] = next;
                  } else {
                    $oob();
                  }
                  if (x >>> 0 < low.length) {
                    low[x] = next;
                  } else {
                    $oob();
                  }
                  next = next + 1 | 0;
                  _M0MPC15array5Array4pushGiE(stack, x);
                  if (x >>> 0 < on.length) {
                    on[x] = true;
                  } else {
                    $oob();
                  }
                  _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(work, { _0: x, _1: new _M0TPC13ref3RefGiE(0) });
                } else {
                  if ((x >>> 0 < on.length ? on[x] : $oob()) && (x >>> 0 < index.length ? index[x] : $oob()) < (_v >>> 0 < low.length ? low[_v] : $oob())) {
                    if (_v >>> 0 < low.length) {
                      low[_v] = x >>> 0 < index.length ? index[x] : $oob();
                    } else {
                      $oob();
                    }
                  }
                }
              } else {
                _M0MPC15array5Array3popGAiE(work);
                if (work.len > 0) {
                  const _bind$3 = work.len - 1 | 0;
                  if (_bind$3 < 0 || _bind$3 >= work.len) {
                    $panic();
                  }
                  const u = work.buf[_bind$3]._0;
                  if ((_v >>> 0 < low.length ? low[_v] : $oob()) < (u >>> 0 < low.length ? low[u] : $oob())) {
                    if (u >>> 0 < low.length) {
                      low[u] = _v >>> 0 < low.length ? low[_v] : $oob();
                    } else {
                      $oob();
                    }
                  }
                }
                if ((_v >>> 0 < low.length ? low[_v] : $oob()) === (_v >>> 0 < index.length ? index[_v] : $oob())) {
                  const group = new _M0TPB5ArrayGiE([], 0);
                  while (true) {
                    const _p = _M0MPC15array5Array3popGiE(stack);
                    let x;
                    if (_p === undefined) {
                      x = $panic();
                    } else {
                      const _p$2 = _p;
                      x = _p$2;
                    }
                    if (x >>> 0 < on.length) {
                      on[x] = false;
                    } else {
                      $oob();
                    }
                    _M0MPC15array5Array4pushGiE(group, x);
                    if (x === _v) {
                      break;
                    }
                    continue;
                  }
                  _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(groups, group);
                }
              }
              continue;
            } else {
              break;
            }
          }
          break _L;
        }
        _tmp = root + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return groups;
  }
  function _M0FP310monkeyfist2mf4core12sq__blockers(b) {
    const _p = b.n;
    if (_p <= 0) {
      return new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    } else {
      const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p);
      let _tmp = 0;
      while (true) {
        const _p$3 = _tmp;
        if (_p$3 < _p) {
          const _p$4 = b.seq;
          if (_p$3 < 0 || _p$3 >= _p$4.len) {
            $panic();
          }
          const _p$5 = _p$4.buf[_p$3];
          const _p$6 = new _M0TPB5ArrayGiE([], 0);
          const _tmp$2 = b.len;
          const _p$7 = _p$3 >>> 0 < _tmp$2.length ? _tmp$2[_p$3] : $oob();
          const _p$8 = _p$5.length;
          let _tmp$3 = _p$7;
          while (true) {
            const _p$9 = _tmp$3;
            if (_p$9 < _p$8) {
              const _tmp$4 = b.occ;
              const _tmp$5 = _p$9 >>> 0 < _p$5.length ? _p$5[_p$9] : $oob();
              const _p$10 = _tmp$5 >>> 0 < _tmp$4.length ? _tmp$4[_tmp$5] : $oob();
              if (_p$10 !== -1 && !_M0FP310monkeyfist2mf4core8contains(_p$6, _p$10)) {
                _M0MPC15array5Array4pushGiE(_p$6, _p$10);
              }
              _tmp$3 = _p$9 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const _p$9 = _p$6;
          _p$2.buf[_p$3] = _p$9;
          _tmp = _p$3 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      return _p$2;
    }
  }
  function _M0FP310monkeyfist2mf4core10sq__looped(b) {
    const out = $make_array_len_and_init(b.n, false);
    const _bind = _M0FP310monkeyfist2mf4core10groups__of(_M0FP310monkeyfist2mf4core12sq__blockers(b));
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const g = _bind$3[_];
        if (g.len > 1) {
          const _bind$4 = g.len;
          const _bind$5 = g.buf;
          let _tmp$2 = 0;
          while (true) {
            const _$2 = _tmp$2;
            if (_$2 < _bind$4) {
              const i = _bind$5[_$2];
              if (i >>> 0 < out.length) {
                out[i] = true;
              } else {
                $oob();
              }
              _tmp$2 = _$2 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return out;
  }
  function _M0MP310monkeyfist2mf4core7SqBoard5paths(b, w) {
    const _p = b.n;
    if (_p <= 0) {
      return new _M0TPB5ArrayGORPB5ArrayGRP310monkeyfist2mf4core2PtEE([], 0);
    } else {
      const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(_p);
      let _tmp = 0;
      while (true) {
        const _p$3 = _tmp;
        if (_p$3 < _p) {
          let _p$4;
          const _tmp$2 = b.off;
          if ((_p$3 >>> 0 < _tmp$2.length ? _tmp$2[_p$3] : $oob()) < 0) {
            _p$4 = undefined;
          } else {
            const _p$5 = b.seq;
            if (_p$3 < 0 || _p$3 >= _p$5.len) {
              $panic();
            }
            const _p$6 = _p$5.buf[_p$3];
            const _tmp$3 = b.len;
            const _p$7 = _p$3 >>> 0 < _tmp$3.length ? _tmp$3[_p$3] : $oob();
            if (_p$7 <= 0) {
              _p$4 = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
            } else {
              const _p$8 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p$7);
              let _tmp$4 = 0;
              while (true) {
                const _p$9 = _tmp$4;
                if (_p$9 < _p$7) {
                  const _tmp$5 = b.off;
                  const _tmp$6 = (_p$3 >>> 0 < _tmp$5.length ? _tmp$5[_p$3] : $oob()) + _p$9 | 0;
                  const _p$10 = _tmp$6 >>> 0 < _p$6.length ? _p$6[_tmp$6] : $oob();
                  const _p$11 = new _M0TP310monkeyfist2mf4core2Pt(_p$10 % w | 0, _p$10 / w | 0);
                  _p$8.buf[_p$9] = _p$11;
                  _tmp$4 = _p$9 + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              _p$4 = _p$8;
            }
          }
          _p$2.buf[_p$3] = _p$4;
          _tmp = _p$3 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      return _p$2;
    }
  }
  function _M0MP310monkeyfist2mf4core7SqBoard9slide__to(b, i) {
    const _bind = b.seq;
    if (i < 0 || i >= _bind.len) {
      $panic();
    }
    const s = _bind.buf[i];
    const _tmp = b.off;
    const _tmp$2 = i >>> 0 < _tmp.length ? _tmp[i] : $oob();
    const _tmp$3 = b.len;
    let p = _tmp$2 + (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) | 0;
    while (true) {
      let _tmp$4;
      if (p < s.length) {
        const _tmp$5 = b.occ;
        const _tmp$6 = p;
        const _tmp$7 = _tmp$6 >>> 0 < s.length ? s[_tmp$6] : $oob();
        _tmp$4 = (_tmp$7 >>> 0 < _tmp$5.length ? _tmp$5[_tmp$7] : $oob()) === -1;
      } else {
        _tmp$4 = false;
      }
      if (_tmp$4) {
        p = p + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    if (p === s.length) {
      return -1;
    } else {
      const _tmp$4 = p;
      const _tmp$5 = b.len;
      return _tmp$4 - (i >>> 0 < _tmp$5.length ? _tmp$5[i] : $oob()) | 0;
    }
  }
  function _M0FP310monkeyfist2mf4core8sq__play(paths, w, h, taps, m) {
    const b = _M0FP310monkeyfist2mf4core14sq__board__exn(paths, w, h, m);
    const _bind = taps.len;
    const _bind$2 = taps.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const i = _bind$2[_];
        const _tmp$2 = b.off;
        if ((i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob()) >= 0) {
          _M0MP310monkeyfist2mf4core7SqBoard5place(b, i, _M0MP310monkeyfist2mf4core7SqBoard9slide__to(b, i));
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return _M0MP310monkeyfist2mf4core7SqBoard5paths(b, w);
  }
  function _M0MP310monkeyfist2mf4core7SqBoard5relax(b) {
    const n = b.n;
    const was = b.was;
    const now = b.now;
    let waiting = 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < n) {
        let v;
        const _tmp$2 = b.off;
        if ((i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob()) < 0) {
          v = 32767;
        } else {
          const _tmp$3 = b.off;
          v = i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob();
        }
        if (i >>> 0 < was.length) {
          was[i] = v;
        } else {
          $oob();
        }
        if (i >>> 0 < now.length) {
          now[i] = v;
        } else {
          $oob();
        }
        const _tmp$3 = b.off;
        if ((i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) >= 0) {
          waiting = waiting + 1 | 0;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let moved = true;
    while (true) {
      if (moved && waiting > 0) {
        moved = false;
        let _tmp$2 = 0;
        while (true) {
          const i = _tmp$2;
          if (i < n) {
            _L: {
              if ((i >>> 0 < was.length ? was[i] : $oob()) === 32767) {
                break _L;
              }
              const _bind = b.seq;
              if (i < 0 || i >= _bind.len) {
                $panic();
              }
              const s = _bind.buf[i];
              const _tmp$3 = b.len;
              const l = i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob();
              let r = i >>> 0 < was.length ? was[i] : $oob();
              while (true) {
                const p = r + l | 0;
                if (p >= s.length) {
                  r = 32767;
                  break;
                }
                const c = p >>> 0 < s.length ? s[p] : $oob();
                const _tmp$4 = b.occ;
                const z = c >>> 0 < _tmp$4.length ? _tmp$4[c] : $oob();
                let _tmp$5;
                if (z !== -1) {
                  let _tmp$6;
                  if (z === i) {
                    _tmp$6 = true;
                  } else {
                    const _tmp$7 = z >>> 0 < was.length ? was[z] : $oob();
                    const _tmp$8 = b.at;
                    _tmp$6 = _tmp$7 <= (c >>> 0 < _tmp$8.length ? _tmp$8[c] : $oob());
                  }
                  _tmp$5 = _tmp$6;
                } else {
                  _tmp$5 = false;
                }
                if (_tmp$5) {
                  break;
                }
                r = r + 1 | 0;
                continue;
              }
              if (r !== (i >>> 0 < was.length ? was[i] : $oob())) {
                if (i >>> 0 < now.length) {
                  now[i] = r;
                } else {
                  $oob();
                }
                moved = true;
                if (r === 32767) {
                  waiting = waiting - 1 | 0;
                }
              }
              break _L;
            }
            _tmp$2 = i + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let _tmp$3 = 0;
        while (true) {
          const i = _tmp$3;
          if (i < n) {
            if (i >>> 0 < was.length) {
              was[i] = i >>> 0 < now.length ? now[i] : $oob();
            } else {
              $oob();
            }
            _tmp$3 = i + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        continue;
      } else {
        break;
      }
    }
    return waiting;
  }
  function _M0FP310monkeyfist2mf4core8finished(cfg, ib) {
    const w = cfg.w;
    const h = cfg.h;
    const n = ib.b.n;
    const _p = ib.paths;
    const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p.len);
    const _p$3 = _p.len;
    const _p$4 = _p.buf;
    let _tmp = 0;
    while (true) {
      const _p$5 = _tmp;
      if (_p$5 < _p$3) {
        const _p$6 = _p$4[_p$5];
        const _p$7 = _M0MPC15array5Array4copyGRP310monkeyfist2mf4core2PtE(_p$6);
        _p$2.buf[_p$5] = _p$7;
        _tmp = _p$5 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const ropes = _p$2;
    const solution = _M0MPC15array5Array4copyGiE(ib.taps);
    let cells = 0;
    const _bind = ropes.len;
    const _bind$2 = ropes.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind) {
        const p = _bind$2[_];
        cells = cells + p.len | 0;
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const filled = (cells + 0) / ((Math.imul(w, h) | 0) + 0);
    let blocked = 0;
    let _tmp$3 = 0;
    while (true) {
      const i = _tmp$3;
      if (i < n) {
        const _tmp$4 = ib.cost;
        if ((i >>> 0 < _tmp$4.length ? _tmp$4[i] : $oob()) > 0) {
          blocked = blocked + 1 | 0;
        }
        _tmp$3 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const share = (blocked + 0) / (n + 0);
    if (w <= 5) {
      if (filled < 0.6) {
        return undefined;
      }
    } else {
      if (filled < 0.72 || share < 0.5) {
        return undefined;
      }
    }
    const start = _M0FP310monkeyfist2mf4core11some__paths(ropes);
    if (!_M0FP310monkeyfist2mf4core9all__gone(_M0FP310monkeyfist2mf4core8sq__play(start, w, h, solution, cfg.mirrors))) {
      return undefined;
    }
    const fin = _M0FP310monkeyfist2mf4core14sq__board__exn(start, w, h, cfg.mirrors);
    const looped = _M0FP310monkeyfist2mf4core10sq__looped(fin);
    let tied_up = 0;
    let fatal = 0;
    let _tmp$4 = 0;
    while (true) {
      const i = _tmp$4;
      if (i < n) {
        let _tmp$5;
        const _bind$3 = ib.stops;
        if (i < 0 || i >= _bind$3.len) {
          $panic();
        }
        if (_bind$3.buf[i].len > 0) {
          _tmp$5 = i >>> 0 < looped.length ? looped[i] : $oob();
        } else {
          _tmp$5 = false;
        }
        if (_tmp$5) {
          tied_up = tied_up + 1 | 0;
        }
        const to = _M0MP310monkeyfist2mf4core7SqBoard9slide__to(fin, i);
        if (to > 0) {
          _M0MP310monkeyfist2mf4core7SqBoard5place(fin, i, to);
          if (_M0MP310monkeyfist2mf4core7SqBoard5relax(fin) > 0) {
            fatal = fatal + 1 | 0;
          }
          _M0MP310monkeyfist2mf4core7SqBoard5place(fin, i, 0);
        }
        _tmp$4 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core5Woven(ropes, solution, tied_up, fatal);
  }
  function _M0FP310monkeyfist2mf4core13self__blocked(path, w, h, m) {
    const hd = _M0FP310monkeyfist2mf4core4last(path);
    if (m.keys.len > 0) {
      const _bind = _M0FP310monkeyfist2mf4core9exit__dir(path, w, m);
      const _dx = _bind._0;
      const _dy = _bind._1;
      const ahead = new _M0TPB5ArrayGiE([], 0);
      if (!_M0FP310monkeyfist2mf4core10ray__cells(hd.q, hd.r, _dx, _dy, w, h, m, ahead)) {
        return true;
      }
      const s = _M0FP310monkeyfist2mf4core11next__stamp(Math.imul(w, h) | 0);
      const _bind$2 = path.len;
      const _bind$3 = path.buf;
      let _tmp = 0;
      while (true) {
        const _ = _tmp;
        if (_ < _bind$2) {
          const p = _bind$3[_];
          const _bind$4 = (Math.imul(p.r, w) | 0) + p.q | 0;
          if (_bind$4 < 0 || _bind$4 >= _M0FP310monkeyfist2mf4core5marks.len) {
            $panic();
          }
          _M0FP310monkeyfist2mf4core5marks.buf[_bind$4] = s;
          _tmp = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      const _bind$4 = ahead.len;
      const _bind$5 = ahead.buf;
      let _tmp$2 = 0;
      while (true) {
        const _ = _tmp$2;
        if (_ < _bind$4) {
          const c = _bind$5[_];
          if (c < 0 || c >= _M0FP310monkeyfist2mf4core5marks.len) {
            $panic();
          }
          if (_M0FP310monkeyfist2mf4core5marks.buf[c] === s) {
            return true;
          }
          _tmp$2 = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      return false;
    }
    const _bind = _M0FP310monkeyfist2mf4core9head__dir(path);
    const _dx = _bind._0;
    const _dy = _bind._1;
    const _bind$2 = path.len;
    const _bind$3 = path.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const p = _bind$3[_];
        if (_dx !== 0) {
          if (p.r === hd.r && (Math.imul(p.q - hd.q | 0, _dx) | 0) > 0) {
            return true;
          }
        } else {
          if (p.q === hd.q && (Math.imul(p.r - hd.r | 0, _dy) | 0) > 0) {
            return true;
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0FP310monkeyfist2mf4core5ssortGUiiEE(a, cmp) {
    const _bind = a.len;
    _M0MPC15array12MutArrayView16stable__sort__byGUiiEE(new _M0TPB12MutArrayViewGUiiEE(a.buf, 0, _bind), cmp);
  }
  function _M0FP310monkeyfist2mf4core5ssortGiE(a, cmp) {
    const _bind = a.len;
    _M0MPC15array12MutArrayView16stable__sort__byGiE(new _M0TPB12MutArrayViewGiE(a.buf, 0, _bind), cmp);
  }
  function _M0FP310monkeyfist2mf4core6unique(a) {
    const out = new _M0TPB5ArrayGiE([], 0);
    const _bind = a.len;
    const _bind$2 = a.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const x = _bind$2[_];
        if (!_M0FP310monkeyfist2mf4core8contains(out, x)) {
          _M0MPC15array5Array4pushGiE(out, x);
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return out;
  }
  function _M0MP310monkeyfist2mf4core3Rng4next(self) {
    self.a = self.a + 1831565813 | 0;
    const a = self.a;
    let t = Math.imul(a ^ (a >>> 15 | 0), 1 | a) | 0;
    const _tmp = t;
    const _tmp$2 = t;
    const _p = t;
    t = _tmp + (Math.imul(_tmp$2 ^ (_p >>> 7 | 0), 61 | t) | 0) ^ t;
    const _tmp$3 = t;
    const _p$2 = t;
    return $f64_convert_i32_u(_tmp$3 ^ (_p$2 >>> 14 | 0)) / 4294967296;
  }
  function _M0MP310monkeyfist2mf4core3Rng5below(self, n) {
    return _M0MPC16double6Double7to__int(_M0MPC16double6Double5floor(_M0MP310monkeyfist2mf4core3Rng4next(self) * (n + 0)));
  }
  function _M0MP310monkeyfist2mf4core9SqMirrors3has(self, c) {
    return _M0MP310monkeyfist2mf4core9SqMirrors3get(self, c) >= 0;
  }
  function _M0FP310monkeyfist2mf4core5weaveN7blockedS3317(_env, path) {
    const h = _env._2;
    const mirrors = _env._1;
    const w = _env._0;
    return _M0FP310monkeyfist2mf4core13self__blocked(path, w, h, mirrors);
  }
  function _M0FP310monkeyfist2mf4core5weaveN4growS3318(_env, start, first, straight) {
    const occ = _env._4;
    const h = _env._3;
    const w = _env._2;
    const rng = _env._1;
    const cfg = _env._0;
    const want = cfg.len_lo + _M0MP310monkeyfist2mf4core3Rng5below(rng, (cfg.len_hi - cfg.len_lo | 0) + 1 | 0) | 0;
    const cells = new _M0TPB5ArrayGiE([start], 1);
    let last = -1;
    if (start >>> 0 < occ.length) {
      occ[start] = -2;
    } else {
      $oob();
    }
    while (true) {
      if (cells.len < want) {
        const _bind = cells.len - 1 | 0;
        if (_bind < 0 || _bind >= cells.len) {
          $panic();
        }
        const c = cells.buf[_bind];
        const x = c % w | 0;
        const y = c / w | 0;
        const opts = new _M0TPB5ArrayGiE([], 0);
        let _tmp = 0;
        while (true) {
          const d = _tmp;
          if (d < 4) {
            const nx = x + (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[d] : $oob()) | 0;
            const ny = y + (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[d] : $oob()) | 0;
            let _tmp$2;
            if (nx >= 0) {
              let _tmp$3;
              if (ny >= 0) {
                let _tmp$4;
                if (nx < w) {
                  let _tmp$5;
                  if (ny < h) {
                    const _tmp$6 = (Math.imul(ny, w) | 0) + nx | 0;
                    _tmp$5 = (_tmp$6 >>> 0 < occ.length ? occ[_tmp$6] : $oob()) === -1;
                  } else {
                    _tmp$5 = false;
                  }
                  _tmp$4 = _tmp$5;
                } else {
                  _tmp$4 = false;
                }
                _tmp$3 = _tmp$4;
              } else {
                _tmp$3 = false;
              }
              _tmp$2 = _tmp$3;
            } else {
              _tmp$2 = false;
            }
            if (_tmp$2) {
              _M0MPC15array5Array4pushGiE(opts, d);
            }
            _tmp = d + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        if (opts.len === 0 || cells.len === 1 && (first >= 0 && !_M0FP310monkeyfist2mf4core8contains(opts, first))) {
          break;
        }
        let d;
        if (cells.len === 1 && first >= 0) {
          d = first;
        } else {
          if (last >= 0 && (_M0FP310monkeyfist2mf4core8contains(opts, last) && _M0MP310monkeyfist2mf4core3Rng4next(rng) < straight)) {
            d = last;
          } else {
            const _bind$2 = _M0MP310monkeyfist2mf4core3Rng5below(rng, opts.len);
            if (_bind$2 < 0 || _bind$2 >= opts.len) {
              $panic();
            }
            d = opts.buf[_bind$2];
          }
        }
        last = d;
        const nc = ((Math.imul(y + (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[d] : $oob()) | 0, w) | 0) + x | 0) + (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[d] : $oob()) | 0;
        _M0MPC15array5Array4pushGiE(cells, nc);
        if (nc >>> 0 < occ.length) {
          occ[nc] = -2;
        } else {
          $oob();
        }
        continue;
      } else {
        break;
      }
    }
    const _bind = cells.len;
    const _bind$2 = cells.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const c = _bind$2[_];
        if (c >>> 0 < occ.length) {
          occ[c] = -1;
        } else {
          $oob();
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return cells;
  }
  function _M0FP310monkeyfist2mf4core5weaveN8way__outS3319(_env, x, y, d) {
    const occ = _env._3;
    const h = _env._2;
    const mirrors = _env._1;
    const w = _env._0;
    const cells = new _M0TPB5ArrayGiE([], 0);
    const dx = d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[d] : $oob();
    const dy = d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[d] : $oob();
    if (mirrors.keys.len > 0) {
      if (!_M0FP310monkeyfist2mf4core10ray__cells(x, y, dx, dy, w, h, mirrors, cells)) {
        return undefined;
      }
    } else {
      let a = x + dx | 0;
      let bb = y + dy | 0;
      while (true) {
        if (a >= 0 && (bb >= 0 && (a < w && bb < h))) {
          _M0MPC15array5Array4pushGiE(cells, (Math.imul(bb, w) | 0) + a | 0);
          a = a + dx | 0;
          bb = bb + dy | 0;
          continue;
        } else {
          break;
        }
      }
    }
    const ids = new _M0TPB5ArrayGiE([], 0);
    let free = 0;
    const _bind = cells.len;
    const _bind$2 = cells.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const c = _bind$2[_];
        const o = c >>> 0 < occ.length ? occ[c] : $oob();
        if (o === -1) {
          free = free + 1 | 0;
        } else {
          if (o >= 0 && !_M0FP310monkeyfist2mf4core8contains(ids, o)) {
            _M0MPC15array5Array4pushGiE(ids, o);
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core4Lane(cells, free, ids);
  }
  function _M0FP310monkeyfist2mf4core5weaveN5trialS3320(_env, path, st) {
    const order = _env._1;
    const ib = _env._0;
    return _M0MP310monkeyfist2mf4core10Intentions5trial(ib, path, st, order.val);
  }
  function _M0FP310monkeyfist2mf4core5weaveN6commitS3321(_env, c) {
    const mirror_used = _env._13;
    const knots = _env._12;
    const b = _env._11;
    const total0 = _env._10;
    const occ = _env._9;
    const mirrors_used = _env._8;
    const mirrors = _env._7;
    const rest = _env._6;
    const w = _env._5;
    const order = _env._4;
    const covered = _env._3;
    const ib = _env._2;
    const traps = _env._1;
    const bend_sum = _env._0;
    const id = _M0MP310monkeyfist2mf4core10Intentions3add(ib, c.path, c.pull > 0 ? new _M0TPB5ArrayGiE([c.pull], 1) : new _M0TPB5ArrayGiE([], 0));
    if (mirrors.keys.len > 0) {
      const _bind = b.seq;
      if (id < 0 || id >= _bind.len) {
        $panic();
      }
      const _bind$2 = _bind.buf[id];
      const _bind$3 = _bind$2.length;
      let _tmp = 0;
      while (true) {
        const _ = _tmp;
        if (_ < _bind$3) {
          const cell = _bind$2[_];
          if (_M0MP310monkeyfist2mf4core9SqMirrors3has(mirrors, cell) && !(cell >>> 0 < mirror_used.length ? mirror_used[cell] : $oob())) {
            if (cell >>> 0 < mirror_used.length) {
              mirror_used[cell] = true;
            } else {
              $oob();
            }
            mirrors_used.val = mirrors_used.val + 1 | 0;
          }
          _tmp = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
    }
    const list = new _M0TPB5ArrayGiE([id], 1);
    const _bind = order.val;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const x = _bind$3[_];
        _M0MPC15array5Array4pushGiE(list, x);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MP310monkeyfist2mf4core10Intentions6replay(ib, list, id);
    total0.val = ib.cost_sum;
    order.val = _M0FP310monkeyfist2mf4core6unique(ib.taps);
    const _bind$4 = ib.paths;
    if (id < 0 || id >= _bind$4.len) {
      $panic();
    }
    const _bind$5 = _bind$4.buf[id];
    const _bind$6 = _bind$5.len;
    const _bind$7 = _bind$5.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$6) {
        const p = _bind$7[_];
        const _tmp$3 = (Math.imul(p.r, w) | 0) + p.q | 0;
        if (_tmp$3 >>> 0 < occ.length) {
          occ[_tmp$3] = id;
        } else {
          $oob();
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _tmp$3 = covered.val;
    const _bind$8 = ib.paths;
    if (id < 0 || id >= _bind$8.len) {
      $panic();
    }
    covered.val = _tmp$3 + _bind$8.buf[id].len | 0;
    bend_sum.val = bend_sum.val + c.bends | 0;
    if (c.pull > 0) {
      knots.val = knots.val + 1 | 0;
      const _bind$9 = c.rest;
      const _bind$10 = _bind$9.len;
      const _bind$11 = _bind$9.buf;
      let _tmp$4 = 0;
      while (true) {
        const _ = _tmp$4;
        if (_ < _bind$10) {
          const cell = _bind$11[_];
          if (cell >>> 0 < rest.length) {
            rest[cell] = id;
          } else {
            $oob();
          }
          _tmp$4 = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
    }
    if (c.gap.len > 0) {
      traps.val = traps.val + 1 | 0;
      const _bind$9 = c.gap;
      const _bind$10 = _bind$9.len;
      const _bind$11 = _bind$9.buf;
      let _tmp$4 = 0;
      while (true) {
        const _ = _tmp$4;
        if (_ < _bind$10) {
          const cell = _bind$11[_];
          if ((cell >>> 0 < occ.length ? occ[cell] : $oob()) === -1) {
            if (cell >>> 0 < occ.length) {
              occ[cell] = -3;
            } else {
              $oob();
            }
          }
          _tmp$4 = _ + 1 | 0;
          continue;
        } else {
          return;
        }
      }
    } else {
      return;
    }
  }
  function _M0FP310monkeyfist2mf4core5weaveN9candidateS3322(_env, kind, at) {
    const mirror_used = _env._16;
    const ahead = _env._15;
    const total0 = _env._14;
    const occ = _env._13;
    const h = _env._12;
    const mirrors = _env._11;
    const _env$2 = _env._10;
    const _env$3 = _env._9;
    const w = _env._8;
    const nn = _env._7;
    const rng = _env._6;
    const _env$4 = _env._5;
    const _env$5 = _env._4;
    const xy = _env._3;
    const ib = _env._2;
    const cfg = _env._1;
    const up = _env._0;
    let start = at >= 0 ? at : -1;
    let dir = -1;
    if (kind === 5) {
      let _bind;
      let _return_value;
      _L: {
        _L$2: {
          const _p = mirrors.keys;
          const _p$2 = new _M0TPB5ArrayGiE([], 0);
          const _p$3 = _p.len;
          const _p$4 = _p.buf;
          let idle;
          let _tmp = 0;
          while (true) {
            const _p$5 = _tmp;
            if (_p$5 < _p$3) {
              const _p$6 = _p$4[_p$5];
              if (!(_p$6 >>> 0 < mirror_used.length ? mirror_used[_p$6] : $oob())) {
                _M0MPC15array5Array4pushGiE(_p$2, _p$6);
              }
              _tmp = _p$5 + 1 | 0;
              continue;
            } else {
              idle = _p$2;
              break;
            }
          }
          if (idle.len === 0) {
            _return_value = undefined;
            break _L$2;
          }
          const _bind$2 = _M0MP310monkeyfist2mf4core3Rng5below(rng, idle.len);
          if (_bind$2 < 0 || _bind$2 >= idle.len) {
            $panic();
          }
          const m = idle.buf[_bind$2];
          const di = _M0MP310monkeyfist2mf4core3Rng5below(rng, 4);
          const j = 1 + _M0MP310monkeyfist2mf4core3Rng5below(rng, 3) | 0;
          const x = (m % w | 0) - (Math.imul(di >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[di] : $oob(), j) | 0) | 0;
          const y = (m / w | 0) - (Math.imul(di >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[di] : $oob(), j) | 0) | 0;
          if (x < 0 || (y < 0 || (x >= w || y >= h))) {
            _return_value = undefined;
            break _L$2;
          }
          let _tmp$2 = 0;
          while (true) {
            const k = _tmp$2;
            if (k < j) {
              const c = ((Math.imul(y + (Math.imul(di >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[di] : $oob(), k) | 0) | 0, w) | 0) + x | 0) + (Math.imul(di >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[di] : $oob(), k) | 0) | 0;
              if ((c >>> 0 < occ.length ? occ[c] : $oob()) !== -1) {
                _return_value = undefined;
                break _L$2;
              }
              _tmp$2 = k + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          _bind = { _0: (Math.imul(y, w) | 0) + x | 0, _1: di };
          break _L;
        }
        _bind = _return_value;
      }
      if (_bind === undefined) {
        return undefined;
      } else {
        const _Some = _bind;
        const _x = _Some;
        const _s = _x._0;
        const _d = _x._1;
        start = _s;
        dir = _d;
      }
    }
    let parent;
    if (start >= 0 || (kind === 3 || kind === 4)) {
      parent = -1;
    } else {
      let _return_value;
      _L: {
        _L$2: {
          const sum = new _M0TPB8MutLocalGiE(0);
          const _p = ib.paths.len;
          let wts;
          if (_p <= 0) {
            wts = new _M0TPB5ArrayGiE([], 0);
          } else {
            const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGiE(_p);
            let _tmp = 0;
            while (true) {
              const _p$3 = _tmp;
              if (_p$3 < _p) {
                let _p$4;
                const _p$5 = ahead.val;
                if (_p$3 < 0 || _p$3 >= _p$5.len) {
                  $panic();
                }
                if (_p$5.buf[_p$3].len === 0) {
                  _p$4 = 0;
                } else {
                  if (kind === 2) {
                    const _tmp$2 = ib.cost;
                    if ((_p$3 >>> 0 < _tmp$2.length ? _tmp$2[_p$3] : $oob()) > 0) {
                      _p$4 = 1;
                    } else {
                      _p$4 = 0;
                    }
                  } else {
                    const _tmp$2 = ib.cost;
                    if ((_p$3 >>> 0 < _tmp$2.length ? _tmp$2[_p$3] : $oob()) > 0) {
                      _p$4 = 0;
                    } else {
                      _p$4 = kind === 0 ? Math.imul((_p$3 >>> 0 < up.length ? up[_p$3] : $oob()) + 1 | 0, (_p$3 >>> 0 < up.length ? up[_p$3] : $oob()) + 1 | 0) | 0 : 1;
                    }
                  }
                }
                sum.val = sum.val + _p$4 | 0;
                const _p$6 = _p$4;
                _p$2.buf[_p$3] = _p$6;
                _tmp = _p$3 + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            wts = _p$2;
          }
          if (sum.val === 0) {
            _return_value = -1;
            break _L$2;
          }
          let r = _M0MP310monkeyfist2mf4core3Rng4next(rng) * (sum.val + 0);
          const _bind = wts.len;
          let _tmp = 0;
          while (true) {
            const i = _tmp;
            if (i < _bind) {
              const _tmp$2 = r;
              if (i < 0 || i >= wts.len) {
                $panic();
              }
              r = _tmp$2 - (wts.buf[i] + 0);
              if (r < 0) {
                _return_value = i;
                break _L$2;
              }
              _tmp = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          parent = wts.len - 1 | 0;
          break _L;
        }
        parent = _return_value;
      }
    }
    if (parent >= 0) {
      const _bind = ahead.val;
      if (parent < 0 || parent >= _bind.len) {
        $panic();
      }
      const _bind$2 = _bind.buf[parent];
      const _bind$3 = ahead.val;
      if (parent < 0 || parent >= _bind$3.len) {
        $panic();
      }
      const _bind$4 = _M0MP310monkeyfist2mf4core3Rng5below(rng, _bind$3.buf[parent].len);
      if (_bind$4 < 0 || _bind$4 >= _bind$2.len) {
        $panic();
      }
      start = _bind$2.buf[_bind$4];
    }
    let t = 0;
    while (true) {
      if (start < 0 && t < 6) {
        const c = _M0MP310monkeyfist2mf4core3Rng5below(rng, nn);
        if ((c >>> 0 < occ.length ? occ[c] : $oob()) === -1) {
          start = c;
        }
        t = t + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    if (start < 0) {
      return undefined;
    }
    const start$2 = start;
    const straight = kind === 4 ? 1 : cfg.straight;
    const dir$2 = dir;
    let _bind;
    let _return_value;
    _L: {
      _L$2: {
        const s = xy(start$2);
        if (dir$2 >= 0 || _M0MP310monkeyfist2mf4core3Rng4next(rng) < 0.75) {
          const opts = new _M0TPB5ArrayGUiRP310monkeyfist2mf4core4LaneiEE([], 0);
          let sum = 0;
          let _tmp = 0;
          while (true) {
            const d = _tmp;
            if (d < 4) {
              _L$3: {
                if (dir$2 >= 0 && d !== dir$2) {
                  break _L$3;
                }
                const bx = s.q - (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[d] : $oob()) | 0;
                const by = s.r - (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[d] : $oob()) | 0;
                let _tmp$2;
                if (bx < 0) {
                  _tmp$2 = true;
                } else {
                  let _tmp$3;
                  if (by < 0) {
                    _tmp$3 = true;
                  } else {
                    let _tmp$4;
                    if (bx >= w) {
                      _tmp$4 = true;
                    } else {
                      let _tmp$5;
                      if (by >= h) {
                        _tmp$5 = true;
                      } else {
                        const _tmp$6 = (Math.imul(by, w) | 0) + bx | 0;
                        _tmp$5 = (_tmp$6 >>> 0 < occ.length ? occ[_tmp$6] : $oob()) !== -1;
                      }
                      _tmp$4 = _tmp$5;
                    }
                    _tmp$3 = _tmp$4;
                  }
                  _tmp$2 = _tmp$3;
                }
                if (_tmp$2) {
                  break _L$3;
                }
                const _bind$2 = _M0FP310monkeyfist2mf4core5weaveN8way__outS3319(_env$4, s.q, s.r, d);
                if (_bind$2 === undefined) {
                  break _L$3;
                } else {
                  const _Some = _bind$2;
                  const _lane = _Some;
                  _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(opts, { _0: d, _1: _lane, _2: _lane.cells.len + 1 | 0 });
                  sum = sum + (_lane.cells.len + 1 | 0) | 0;
                }
                break _L$3;
              }
              _tmp = d + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if (opts.len > 0) {
            let r = _M0MP310monkeyfist2mf4core3Rng4next(rng) * (sum + 0);
            const _bind$2 = opts.len - 1 | 0;
            if (_bind$2 < 0 || _bind$2 >= opts.len) {
              $panic();
            }
            let o = opts.buf[_bind$2];
            const _bind$3 = opts.len;
            const _bind$4 = opts.buf;
            let _tmp$2 = 0;
            while (true) {
              const _ = _tmp$2;
              if (_ < _bind$3) {
                const cand = _bind$4[_];
                r = r - (cand._2 + 0);
                if (r < 0) {
                  o = cand;
                  break;
                }
                _tmp$2 = _ + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            const cells = _M0FP310monkeyfist2mf4core5weaveN4growS3318(_env$3, start$2, (o._0 + 2 | 0) % 4 | 0, straight);
            const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(cells.len);
            const _p$2 = cells.len;
            const _p$3 = cells.buf;
            let _tmp$3 = 0;
            while (true) {
              const _p$4 = _tmp$3;
              if (_p$4 < _p$2) {
                const _p$5 = _p$3[_p$4];
                const _p$6 = xy(_p$5);
                _p.buf[_p$4] = _p$6;
                _tmp$3 = _p$4 + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            const path = _p;
            _M0MPC15array5Array14rev__in__placeGRP310monkeyfist2mf4core2PtE(path);
            if (cells.len >= cfg.min_len && !_M0FP310monkeyfist2mf4core5weaveN7blockedS3317(_env$5, path)) {
              _return_value = new _M0TP310monkeyfist2mf4core6Shaped(cells, path, o._1);
              break _L$2;
            }
          }
          if (dir$2 >= 0) {
            _return_value = undefined;
            break _L$2;
          }
        }
        const cells = _M0FP310monkeyfist2mf4core5weaveN4growS3318(_env$3, start$2, -1, straight);
        if (cells.len < cfg.min_len) {
          _return_value = undefined;
          break _L$2;
        }
        const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(cells.len);
        const _p$2 = cells.len;
        const _p$3 = cells.buf;
        let _tmp = 0;
        while (true) {
          const _p$4 = _tmp;
          if (_p$4 < _p$2) {
            const _p$5 = _p$3[_p$4];
            const _p$6 = xy(_p$5);
            _p.buf[_p$4] = _p$6;
            _tmp = _p$4 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const a = _p;
        const bpath = _M0MPC15array5Array4copyGRP310monkeyfist2mf4core2PtE(a);
        _M0MPC15array5Array14rev__in__placeGRP310monkeyfist2mf4core2PtE(bpath);
        const ok = new _M0TPB5ArrayGRP310monkeyfist2mf4core6ShapedE([], 0);
        let _bind_buf = [a, bpath];
        let _bind_len = 2;
        const _bind$2 = _bind_len;
        const _bind$3 = _bind_buf;
        let _tmp$2 = 0;
        while (true) {
          const _ = _tmp$2;
          if (_ < _bind$2) {
            const p = _bind$3[_];
            if (!_M0FP310monkeyfist2mf4core5weaveN7blockedS3317(_env$5, p)) {
              const hd = _M0FP310monkeyfist2mf4core4last(p);
              const _bind$4 = _M0FP310monkeyfist2mf4core9head__dir(p);
              const _dx = _bind$4._0;
              const _dy = _bind$4._1;
              const _tmp$3 = hd.q;
              const _tmp$4 = hd.r;
              let _tmp$5;
              let _return_value$2;
              _L$3: {
                _L$4: {
                  let _tmp$6 = 0;
                  while (true) {
                    const d = _tmp$6;
                    if (d < 4) {
                      if ((d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[d] : $oob()) === _dx && (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[d] : $oob()) === _dy) {
                        _return_value$2 = d;
                        break _L$4;
                      }
                      _tmp$6 = d + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  _tmp$5 = $panic("bad direction");
                  break _L$3;
                }
                _tmp$5 = _return_value$2;
              }
              const _p$4 = _M0FP310monkeyfist2mf4core5weaveN8way__outS3319(_env$4, _tmp$3, _tmp$4, _tmp$5);
              let _tmp$6;
              if (_p$4 === undefined) {
                _tmp$6 = $panic();
              } else {
                const _p$5 = _p$4;
                _tmp$6 = _p$5;
              }
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(ok, new _M0TP310monkeyfist2mf4core6Shaped(cells, p, _tmp$6));
            }
            _tmp$2 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        if (ok.len === 0) {
          _return_value = undefined;
          break _L$2;
        }
        let _tmp$3;
        if (ok.len === 2) {
          let _tmp$4;
          if (1 >= ok.len) {
            $panic();
          }
          const _tmp$5 = ok.buf[1].lane.cells.len;
          if (0 >= ok.len) {
            $panic();
          }
          if (_tmp$5 > ok.buf[0].lane.cells.len) {
            _tmp$4 = true;
          } else {
            let _tmp$6;
            if (1 >= ok.len) {
              $panic();
            }
            const _tmp$7 = ok.buf[1].lane.cells.len;
            if (0 >= ok.len) {
              $panic();
            }
            if (_tmp$7 === ok.buf[0].lane.cells.len) {
              _tmp$6 = _M0MP310monkeyfist2mf4core3Rng4next(rng) < 0.5;
            } else {
              _tmp$6 = false;
            }
            _tmp$4 = _tmp$6;
          }
          _tmp$3 = _tmp$4;
        } else {
          _tmp$3 = false;
        }
        if (_tmp$3) {
          if (1 >= ok.len) {
            $panic();
          }
          _bind = ok.buf[1];
        } else {
          if (0 >= ok.len) {
            $panic();
          }
          _bind = ok.buf[0];
        }
        break _L;
      }
      _bind = _return_value;
    }
    if (_bind === undefined) {
      return undefined;
    } else {
      const _Some = _bind;
      const _c = _Some;
      const sum = _M0FP310monkeyfist2mf4core5weaveN5trialS3320(_env$2, _c.path, new _M0TPB5ArrayGiE([], 0));
      if (sum < 0) {
        return undefined;
      }
      return new _M0TP310monkeyfist2mf4core4Cand(_c.path, _c.lane, sum - total0.val | 0, _M0FP310monkeyfist2mf4core9bends__of(_c.path), 0, new _M0TPB5ArrayGiE([], 0), new _M0TPB5ArrayGiE([], 0));
    }
  }
  function _M0FP310monkeyfist2mf4core5weaveN5belowS3323(_env, blockers) {
    const stamp = _env._2;
    const mark = _env._1;
    const blk = _env._0;
    stamp.val = stamp.val + 1 | 0;
    const stack = _M0MPC15array5Array4copyGiE(blockers);
    const _bind = stack.len;
    const _bind$2 = stack.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const z = _bind$2[_];
        if (z >>> 0 < mark.length) {
          mark[z] = stamp.val;
        } else {
          $oob();
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    while (true) {
      if (stack.len > 0) {
        const _p = _M0MPC15array5Array3popGiE(stack);
        let x;
        if (_p === undefined) {
          x = $panic();
        } else {
          const _p$2 = _p;
          x = _p$2;
        }
        const _bind$3 = blk.val;
        if (x < 0 || x >= _bind$3.len) {
          $panic();
        }
        const _bind$4 = _bind$3.buf[x];
        const _bind$5 = _bind$4.len;
        const _bind$6 = _bind$4.buf;
        let _tmp$2 = 0;
        while (true) {
          const _ = _tmp$2;
          if (_ < _bind$5) {
            const y = _bind$6[_];
            if ((y >>> 0 < mark.length ? mark[y] : $oob()) !== stamp.val) {
              if (y >>> 0 < mark.length) {
                mark[y] = stamp.val;
              } else {
                $oob();
              }
              _M0MPC15array5Array4pushGiE(stack, y);
            }
            _tmp$2 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        continue;
      } else {
        return;
      }
    }
  }
  function _M0FP310monkeyfist2mf4core5weaveN4tiedS3324(_env, cell) {
    const stamp = _env._2;
    const lanes = _env._1;
    const mark = _env._0;
    if (cell < 0 || cell >= lanes.len) {
      $panic();
    }
    const _bind = lanes.buf[cell];
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const id = _bind$3[_];
        if ((id >>> 0 < mark.length ? mark[id] : $oob()) === stamp.val) {
          return true;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0FP310monkeyfist2mf4core5weaveN8to__pathS3325(xy, cells) {
    const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(cells.len);
    const _p$2 = cells.len;
    const _p$3 = cells.buf;
    let _tmp = 0;
    while (true) {
      const _p$4 = _tmp;
      if (_p$4 < _p$2) {
        const _p$5 = _p$3[_p$4];
        const _p$6 = xy(_p$5);
        _p.buf[_p$4] = _p$6;
        _tmp = _p$4 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const p = _p;
    _M0MPC15array5Array14rev__in__placeGRP310monkeyfist2mf4core2PtE(p);
    return p;
  }
  function _M0FP310monkeyfist2mf4core5weaveN4walkS3326(_env, spot, k) {
    const occ = _env._7;
    const h = _env._6;
    const w = _env._5;
    const _env$2 = _env._4;
    const rng = _env._3;
    const _env$3 = _env._2;
    const xy = _env._1;
    const cfg = _env._0;
    const back = (spot.di + 2 | 0) % 4 | 0;
    const _p = k + 2 | 0;
    const _p$2 = cfg.len_lo + _M0MP310monkeyfist2mf4core3Rng5below(rng, (cfg.len_hi - cfg.len_lo | 0) + 1 | 0) | 0;
    const want = _p > _p$2 ? _p : _p$2;
    const cells = new _M0TPB5ArrayGiE([spot.c], 1);
    const tail = new _M0TPB5ArrayGiE([], 0);
    let last = back;
    let got = false;
    const _tmp = spot.c;
    if (_tmp >>> 0 < occ.length) {
      occ[_tmp] = -2;
    } else {
      $oob();
    }
    while (true) {
      if ((cells.len + tail.len | 0) < (want + k | 0)) {
        const body = cells.len < want;
        let c;
        if (body || tail.len === 0) {
          const _bind = cells.len - 1 | 0;
          if (_bind < 0 || _bind >= cells.len) {
            $panic();
          }
          c = cells.buf[_bind];
        } else {
          const _bind = tail.len - 1 | 0;
          if (_bind < 0 || _bind >= tail.len) {
            $panic();
          }
          c = tail.buf[_bind];
        }
        const x = c % w | 0;
        const y = c / w | 0;
        const opts = new _M0TPB5ArrayGiE([], 0);
        let _tmp$2 = 0;
        while (true) {
          const di = _tmp$2;
          if (di < 4) {
            const nx = x + (di >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[di] : $oob()) | 0;
            const ny = y + (di >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[di] : $oob()) | 0;
            const nc = (Math.imul(ny, w) | 0) + nx | 0;
            if (nx >= 0 && (ny >= 0 && (nx < w && (ny < h && ((nc >>> 0 < occ.length ? occ[nc] : $oob()) === -1 && (!body || !_M0FP310monkeyfist2mf4core5weaveN4tiedS3324(_env$2, nc))))))) {
              _M0MPC15array5Array4pushGiE(opts, di);
            }
            _tmp$2 = di + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        if (opts.len === 0) {
          break;
        }
        let di = 0;
        if (body) {
          if (cells.len <= (k + 1 | 0)) {
            if (!_M0FP310monkeyfist2mf4core8contains(opts, back)) {
              break;
            }
            di = back;
          } else {
            let _tmp$3;
            if (_M0FP310monkeyfist2mf4core8contains(opts, last) && _M0MP310monkeyfist2mf4core3Rng4next(rng) < cfg.straight) {
              _tmp$3 = last;
            } else {
              const _bind = _M0MP310monkeyfist2mf4core3Rng5below(rng, opts.len);
              if (_bind < 0 || _bind >= opts.len) {
                $panic();
              }
              _tmp$3 = opts.buf[_bind];
            }
            di = _tmp$3;
          }
        } else {
          let ties;
          if (got) {
            ties = new _M0TPB5ArrayGiE([], 0);
          } else {
            const _p$3 = new _M0TPB5ArrayGiE([], 0);
            const _p$4 = opts.len;
            const _p$5 = opts.buf;
            let _tmp$3 = 0;
            while (true) {
              const _p$6 = _tmp$3;
              if (_p$6 < _p$4) {
                const _p$7 = _p$5[_p$6];
                if (_M0FP310monkeyfist2mf4core5weaveN4tiedS3324(_env$2, ((Math.imul(y + (_p$7 >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[_p$7] : $oob()) | 0, w) | 0) + x | 0) + (_p$7 >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[_p$7] : $oob()) | 0)) {
                  _M0MPC15array5Array4pushGiE(_p$3, _p$7);
                }
                _tmp$3 = _p$6 + 1 | 0;
                continue;
              } else {
                ties = _p$3;
                break;
              }
            }
          }
          let _tmp$3;
          if (ties.len > 0) {
            const _bind = _M0MP310monkeyfist2mf4core3Rng5below(rng, ties.len);
            if (_bind < 0 || _bind >= ties.len) {
              $panic();
            }
            _tmp$3 = ties.buf[_bind];
          } else {
            const _bind = _M0MP310monkeyfist2mf4core3Rng5below(rng, opts.len);
            if (_bind < 0 || _bind >= opts.len) {
              $panic();
            }
            _tmp$3 = opts.buf[_bind];
          }
          di = _tmp$3;
        }
        last = di;
        const _tmp$3 = di;
        const _tmp$4 = (Math.imul(y + (_tmp$3 >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[_tmp$3] : $oob()) | 0, w) | 0) + x | 0;
        const _tmp$5 = di;
        const nc = _tmp$4 + (_tmp$5 >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[_tmp$5] : $oob()) | 0;
        if (nc >>> 0 < occ.length) {
          occ[nc] = -2;
        } else {
          $oob();
        }
        if (body) {
          _M0MPC15array5Array4pushGiE(cells, nc);
        } else {
          _M0MPC15array5Array4pushGiE(tail, nc);
          if (_M0FP310monkeyfist2mf4core5weaveN4tiedS3324(_env$2, nc)) {
            got = true;
          }
        }
        continue;
      } else {
        break;
      }
    }
    const _bind = cells.len;
    const _bind$2 = cells.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind) {
        const c = _bind$2[_];
        if (c >>> 0 < occ.length) {
          occ[c] = -1;
        } else {
          $oob();
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$3 = tail.len;
    const _bind$4 = tail.buf;
    let _tmp$3 = 0;
    while (true) {
      const _ = _tmp$3;
      if (_ < _bind$3) {
        const c = _bind$4[_];
        if (c >>> 0 < occ.length) {
          occ[c] = -1;
        } else {
          $oob();
        }
        _tmp$3 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let _tmp$4;
    const _tmp$5 = cells.len;
    const _p$3 = cfg.min_len;
    const _p$4 = k + 2 | 0;
    if (_tmp$5 < (_p$3 > _p$4 ? _p$3 : _p$4)) {
      _tmp$4 = true;
    } else {
      _tmp$4 = _M0FP310monkeyfist2mf4core5weaveN7blockedS3317(_env$3, _M0FP310monkeyfist2mf4core5weaveN8to__pathS3325(xy, cells));
    }
    if (_tmp$4) {
      return undefined;
    }
    if (k > 0) {
      if (tail.len < k || !got) {
        return undefined;
      }
      const joined = _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(cells, k, undefined));
      const _bind$5 = tail.len;
      const _bind$6 = tail.buf;
      let _tmp$6 = 0;
      while (true) {
        const _ = _tmp$6;
        if (_ < _bind$5) {
          const c = _bind$6[_];
          _M0MPC15array5Array4pushGiE(joined, c);
          _tmp$6 = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      if (_M0FP310monkeyfist2mf4core5weaveN7blockedS3317(_env$3, _M0FP310monkeyfist2mf4core5weaveN8to__pathS3325(xy, joined))) {
        return undefined;
      }
    }
    return { _0: cells, _1: tail };
  }
  function _M0FP310monkeyfist2mf4core5weaveN4fitsS3327(bend_sum, c, budget) {
    if (c === undefined) {
      return undefined;
    } else {
      const _Some = c;
      const _c = _Some;
      return (_c.gain + _c.bends | 0) <= budget && (bend_sum.val + _c.bends | 0) <= 999999 ? _c : undefined;
    }
  }
  function _M0FP310monkeyfist2mf4core5weave(rng, cfg) {
    const w = cfg.w;
    const h = cfg.h;
    const nn = Math.imul(w, h) | 0;
    const occ = $make_array_len_and_init(nn, -1);
    const mirrors = cfg.mirrors;
    const xy = (c) => new _M0TP310monkeyfist2mf4core2Pt(c % w | 0, c / w | 0);
    const _env = { _0: w, _1: mirrors, _2: h };
    const _bind = mirrors.keys;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const c = _bind$3[_];
        if (c >>> 0 < occ.length) {
          occ[c] = -4;
        } else {
          $oob();
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const ib = _M0MP310monkeyfist2mf4core10Intentions3new(w, h, mirrors);
    const b = ib.b;
    const order = new _M0TPB8MutLocalGRPB5ArrayGiEE(new _M0TPB5ArrayGiE([], 0));
    const total0 = new _M0TPB8MutLocalGiE(0);
    const bend_sum = new _M0TPB8MutLocalGiE(0);
    const covered = new _M0TPB8MutLocalGiE(0);
    const knots = new _M0TPB8MutLocalGiE(0);
    const traps = new _M0TPB8MutLocalGiE(0);
    const mirror_used = $make_array_len_and_init(nn, false);
    const mirrors_used = new _M0TPB8MutLocalGiE(0);
    const rest = $make_array_len_and_init(nn, -1);
    const _env$2 = { _0: cfg, _1: rng, _2: w, _3: h, _4: occ };
    const _env$3 = { _0: w, _1: mirrors, _2: h, _3: occ };
    const _env$4 = { _0: ib, _1: order };
    const _env$5 = { _0: bend_sum, _1: traps, _2: ib, _3: covered, _4: order, _5: w, _6: rest, _7: mirrors, _8: mirrors_used, _9: occ, _10: total0, _11: b, _12: knots, _13: mirror_used };
    const ahead = new _M0TPB8MutLocalGRPB5ArrayGRPB5ArrayGiEEE(new _M0TPB5ArrayGRPB5ArrayGiEE([], 0));
    const blk = new _M0TPB8MutLocalGRPB5ArrayGRPB5ArrayGiEEE(new _M0TPB5ArrayGRPB5ArrayGiEE([], 0));
    let lanes;
    if (nn <= 0) {
      lanes = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(nn);
      let _tmp$2 = 0;
      while (true) {
        const _p$2 = _tmp$2;
        if (_p$2 < nn) {
          const _p$3 = new _M0TPB5ArrayGiE([], 0);
          _p.buf[_p$2] = _p$3;
          _tmp$2 = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      lanes = _p;
    }
    const up = $make_array_len_and_init(nn, 0);
    const _env$6 = { _0: up, _1: cfg, _2: ib, _3: xy, _4: _env, _5: _env$3, _6: rng, _7: nn, _8: w, _9: _env$2, _10: _env$4, _11: mirrors, _12: h, _13: occ, _14: total0, _15: ahead, _16: mirror_used };
    const mark = $make_array_len_and_init(nn + 1 | 0, 0);
    const stamp = new _M0TPB8MutLocalGiE(0);
    const _env$7 = { _0: blk, _1: mark, _2: stamp };
    const _env$8 = { _0: mark, _1: lanes, _2: stamp };
    const _env$9 = { _0: cfg, _1: xy, _2: _env, _3: rng, _4: _env$8, _5: w, _6: h, _7: occ };
    const mean_len = ((cfg.len_lo + cfg.len_hi | 0) + 0) / 2 * 0.85;
    const cover_goal = cfg.cover * (nn + 0);
    const kinds_any = new _M0TPB5ArrayGiE([3], 1);
    const kinds_plain = new _M0TPB5ArrayGiE([4], 1);
    const kinds_deep = new _M0TPB5ArrayGiE([0, 0, 1, 2, 0, 3, 1, 2], 8);
    const kinds_leaf = new _M0TPB5ArrayGiE([1, 2, 3, 1, 2, 4, 3, 1], 8);
    const kinds_inner = new _M0TPB5ArrayGiE([2, 3, 4, 2, 3, 4, 2, 3], 8);
    let _tmp$2;
    if (cfg.initial_ropes.len > 0) {
      let _tmp$3;
      let _return_value;
      _L: {
        _L$2: {
          const occupied = $make_array_len_and_init(nn, false);
          let size = 0;
          const _bind$4 = cfg.initial_ropes.len;
          let _tmp$4 = 0;
          while (true) {
            const i = _tmp$4;
            if (i < _bind$4) {
              const _bind$5 = cfg.initial_ropes;
              if (i < 0 || i >= _bind$5.len) {
                $panic();
              }
              const path = _bind$5.buf[i];
              if (path.len < 2) {
                _return_value = false;
                break _L$2;
              }
              const _bind$6 = path.len;
              const _bind$7 = path.buf;
              let _tmp$5 = 0;
              while (true) {
                const _ = _tmp$5;
                if (_ < _bind$6) {
                  const p = _bind$7[_];
                  let _tmp$6;
                  if (p.q < 0) {
                    _tmp$6 = true;
                  } else {
                    let _tmp$7;
                    if (p.r < 0) {
                      _tmp$7 = true;
                    } else {
                      let _tmp$8;
                      if (p.q >= w) {
                        _tmp$8 = true;
                      } else {
                        let _tmp$9;
                        if (p.r >= h) {
                          _tmp$9 = true;
                        } else {
                          const _tmp$10 = (Math.imul(p.r, w) | 0) + p.q | 0;
                          _tmp$9 = _tmp$10 >>> 0 < occupied.length ? occupied[_tmp$10] : $oob();
                        }
                        _tmp$8 = _tmp$9;
                      }
                      _tmp$7 = _tmp$8;
                    }
                    _tmp$6 = _tmp$7;
                  }
                  if (_tmp$6) {
                    _return_value = false;
                    break _L$2;
                  }
                  const _tmp$7 = (Math.imul(p.r, w) | 0) + p.q | 0;
                  if (_tmp$7 >>> 0 < occupied.length) {
                    occupied[_tmp$7] = true;
                  } else {
                    $oob();
                  }
                  size = size + 1 | 0;
                  _tmp$5 = _ + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              let st;
              if (i < cfg.initial_stops.len) {
                const _bind$8 = cfg.initial_stops;
                if (i < 0 || i >= _bind$8.len) {
                  $panic();
                }
                st = _M0MPC15array5Array4copyGiE(_bind$8.buf[i]);
              } else {
                st = new _M0TPB5ArrayGiE([], 0);
              }
              _M0MP310monkeyfist2mf4core10Intentions3add(ib, _M0MPC15array5Array4copyGRP310monkeyfist2mf4core2PtE(path), st);
              _tmp$4 = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const _bind$5 = cfg.initial_plan;
          let _tmp$5;
          if (_bind$5 === undefined) {
            const _p = ib.paths.len;
            if (_p <= 0) {
              _tmp$5 = new _M0TPB5ArrayGiE([], 0);
            } else {
              const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGiE(_p);
              let _tmp$6 = 0;
              while (true) {
                const _p$3 = _tmp$6;
                if (_p$3 < _p) {
                  const _p$4 = _p$3;
                  _p$2.buf[_p$3] = _p$4;
                  _tmp$6 = _p$3 + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              _tmp$5 = _p$2;
            }
          } else {
            const _Some = _bind$5;
            const _p = _Some;
            _tmp$5 = _M0MPC15array5Array4copyGiE(_p);
          }
          order.val = _tmp$5;
          if (!_M0MP310monkeyfist2mf4core10Intentions6replay(ib, order.val, -1)) {
            _return_value = false;
            break _L$2;
          }
          total0.val = ib.cost_sum;
          bend_sum.val = 0;
          const _bind$6 = ib.paths;
          const _bind$7 = _bind$6.len;
          const _bind$8 = _bind$6.buf;
          let _tmp$6 = 0;
          while (true) {
            const _ = _tmp$6;
            if (_ < _bind$7) {
              const p = _bind$8[_];
              bend_sum.val = bend_sum.val + _M0FP310monkeyfist2mf4core9bends__of(p) | 0;
              _tmp$6 = _ + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          covered.val = size;
          const _p = ib.stops;
          const _p$2 = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
          const _p$3 = _p.len;
          const _p$4 = _p.buf;
          let _tmp$7;
          let _tmp$8 = 0;
          while (true) {
            const _p$5 = _tmp$8;
            if (_p$5 < _p$3) {
              const _p$6 = _p$4[_p$5];
              if (_p$6.len > 0) {
                _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(_p$2, _p$6);
              }
              _tmp$8 = _p$5 + 1 | 0;
              continue;
            } else {
              _tmp$7 = _p$2;
              break;
            }
          }
          knots.val = _tmp$7.len;
          const _bind$9 = ib.paths.len;
          let _tmp$9 = 0;
          while (true) {
            const i = _tmp$9;
            if (i < _bind$9) {
              const _bind$10 = ib.paths;
              if (i < 0 || i >= _bind$10.len) {
                $panic();
              }
              const _bind$11 = _bind$10.buf[i];
              const _bind$12 = _bind$11.len;
              const _bind$13 = _bind$11.buf;
              let _tmp$10 = 0;
              while (true) {
                const _ = _tmp$10;
                if (_ < _bind$12) {
                  const p = _bind$13[_];
                  const _tmp$11 = (Math.imul(p.r, w) | 0) + p.q | 0;
                  if (_tmp$11 >>> 0 < occ.length) {
                    occ[_tmp$11] = i;
                  } else {
                    $oob();
                  }
                  _tmp$10 = _ + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              const _bind$14 = ib.stops;
              if (i < 0 || i >= _bind$14.len) {
                $panic();
              }
              const _bind$15 = _bind$14.buf[i];
              const _bind$16 = _bind$15.len;
              const _bind$17 = _bind$15.buf;
              let _tmp$11 = 0;
              while (true) {
                const _ = _tmp$11;
                if (_ < _bind$16) {
                  const offset = _bind$17[_];
                  const _tmp$12 = b.len;
                  const _bind$18 = i >>> 0 < _tmp$12.length ? _tmp$12[i] : $oob();
                  const _tmp$13 = b.len;
                  const _bind$19 = (i >>> 0 < _tmp$13.length ? _tmp$13[i] : $oob()) + offset | 0;
                  let _tmp$14 = _bind$18;
                  while (true) {
                    const j = _tmp$14;
                    if (j < _bind$19) {
                      const _bind$20 = b.seq;
                      if (i < 0 || i >= _bind$20.len) {
                        $panic();
                      }
                      const _tmp$15 = _bind$20.buf[i];
                      const _tmp$16 = j >>> 0 < _tmp$15.length ? _tmp$15[j] : $oob();
                      if ((_tmp$16 >>> 0 < occ.length ? occ[_tmp$16] : $oob()) === -1) {
                        const _bind$21 = b.seq;
                        if (i < 0 || i >= _bind$21.len) {
                          $panic();
                        }
                        const _tmp$17 = _bind$21.buf[i];
                        const _tmp$18 = j >>> 0 < _tmp$17.length ? _tmp$17[j] : $oob();
                        if (_tmp$18 >>> 0 < rest.length) {
                          rest[_tmp$18] = i;
                        } else {
                          $oob();
                        }
                      }
                      _tmp$14 = j + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  _tmp$11 = _ + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              _tmp$9 = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          order.val = _M0FP310monkeyfist2mf4core6unique(ib.taps);
          _tmp$3 = true;
          break _L;
        }
        _tmp$3 = _return_value;
      }
      _tmp$2 = !_tmp$3;
    } else {
      _tmp$2 = false;
    }
    if (_tmp$2) {
      return undefined;
    }
    let stuck = 0;
    const _bind$4 = Math.imul(2, nn) | 0;
    let _tmp$3 = 0;
    while (true) {
      const _ = _tmp$3;
      if (_ < _bind$4) {
        _L: {
          const score = total0.val + bend_sum.val | 0;
          if (score >= 0 && (b.n >= 3 && covered.val + 0 >= cover_goal)) {
            break;
          }
          const n = b.n;
          const budget = 999999 - score | 0;
          const _p = (cover_goal - (covered.val + 0)) / mean_len;
          const room = 1 > _p ? 1 : _p;
          const desire = cfg.tap_depth;
          ahead.val = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
          blk.val = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
          let _tmp$4 = 0;
          while (true) {
            const c = _tmp$4;
            if (c < nn) {
              if (c < 0 || c >= lanes.len) {
                $panic();
              }
              _M0MPC15array5Array5clearGiE(lanes.buf[c]);
              _tmp$4 = c + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const _bind$5 = b.n;
          let _tmp$5 = 0;
          while (true) {
            const i = _tmp$5;
            if (i < _bind$5) {
              const _bind$6 = b.seq;
              if (i < 0 || i >= _bind$6.len) {
                $panic();
              }
              const q = _bind$6.buf[i];
              const free = new _M0TPB5ArrayGiE([], 0);
              const ids = new _M0TPB5ArrayGiE([], 0);
              const _tmp$6 = b.len;
              const _bind$7 = i >>> 0 < _tmp$6.length ? _tmp$6[i] : $oob();
              const _bind$8 = q.length;
              let _tmp$7 = _bind$7;
              while (true) {
                const p = _tmp$7;
                if (p < _bind$8) {
                  const _tmp$8 = p >>> 0 < q.length ? q[p] : $oob();
                  const o = _tmp$8 >>> 0 < occ.length ? occ[_tmp$8] : $oob();
                  if (o === -1) {
                    _M0MPC15array5Array4pushGiE(free, p >>> 0 < q.length ? q[p] : $oob());
                    const _bind$9 = p >>> 0 < q.length ? q[p] : $oob();
                    if (_bind$9 < 0 || _bind$9 >= lanes.len) {
                      $panic();
                    }
                    _M0MPC15array5Array4pushGiE(lanes.buf[_bind$9], i);
                  } else {
                    if (o >= 0 && !_M0FP310monkeyfist2mf4core8contains(ids, o)) {
                      _M0MPC15array5Array4pushGiE(ids, o);
                    }
                  }
                  _tmp$7 = p + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(ahead.val, free);
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(blk.val, ids);
              _tmp$5 = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const _bind$6 = b.n;
          let _tmp$6 = 0;
          while (true) {
            const i = _tmp$6;
            if (i < _bind$6) {
              if (i >>> 0 < up.length) {
                up[i] = 0;
              } else {
                $oob();
              }
              _tmp$6 = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const by_cost = _M0MPC15array5Array4copyGiE(order.val);
          _M0FP310monkeyfist2mf4core5ssortGiE(by_cost, (x, y) => {
            const _tmp$7 = ib.cost;
            const _tmp$8 = y >>> 0 < _tmp$7.length ? _tmp$7[y] : $oob();
            const _tmp$9 = ib.cost;
            return _tmp$8 - (x >>> 0 < _tmp$9.length ? _tmp$9[x] : $oob()) | 0;
          });
          const _bind$7 = by_cost.len;
          const _bind$8 = by_cost.buf;
          let _tmp$7 = 0;
          while (true) {
            const _$2 = _tmp$7;
            if (_$2 < _bind$7) {
              const i = _bind$8[_$2];
              const _tmp$8 = ib.dep;
              const d = i >>> 0 < _tmp$8.length ? _tmp$8[i] : $oob();
              if (d >= 0 && ((i >>> 0 < up.length ? up[i] : $oob()) + 1 | 0) > (d >>> 0 < up.length ? up[d] : $oob())) {
                if (d >>> 0 < up.length) {
                  up[d] = (i >>> 0 < up.length ? up[i] : $oob()) + 1 | 0;
                } else {
                  $oob();
                }
              }
              _tmp$7 = _$2 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          let _bind$9;
          let _return_value;
          _L$2: {
            _L$3: {
              const want_knots = cfg.tie - knots.val | 0;
              const want_traps = cfg.bait - traps.val | 0;
              if (n < 2 || (want_knots <= 0 && want_traps <= 0 || !(_M0MP310monkeyfist2mf4core3Rng4next(rng) < ((Math.imul(2, want_knots + want_traps | 0) | 0) + 0) / room))) {
                _return_value = undefined;
                break _L$3;
              }
              const _bind$10 = _M0FP310monkeyfist2mf4core11knot__spots(occ, rest, w, h, mirrors, cfg.pull);
              const _tight = _bind$10._0;
              const _chain = _bind$10._1;
              const _gapped = _bind$10._2;
              const knot_first = want_knots > 0 && (want_traps <= 0 || knots.val <= traps.val);
              let k = 0;
              while (true) {
                if (k < 24) {
                  const is_knot = k < 12 ? knot_first : !knot_first;
                  if ((is_knot ? want_knots : want_traps) <= 0) {
                    k = k < 12 ? 11 : 24;
                    k = k + 1 | 0;
                    continue;
                  }
                  const list = !is_knot ? _gapped : _chain.len > 0 && (_M0MP310monkeyfist2mf4core3Rng4next(rng) < 0.5 || _tight.len === 0) ? _chain : _tight;
                  if (list.len === 0) {
                    k = k + 1 | 0;
                    continue;
                  }
                  const _bind$11 = _M0MP310monkeyfist2mf4core3Rng5below(rng, list.len);
                  if (_bind$11 < 0 || _bind$11 >= list.len) {
                    $panic();
                  }
                  const spot = list.buf[_bind$11];
                  let c;
                  if (is_knot) {
                    let _return_value$2;
                    _L$4: {
                      _L$5: {
                        const _bind$12 = _M0FP310monkeyfist2mf4core5weaveN8way__outS3319(_env$3, spot.c % w | 0, spot.c / w | 0, spot.di);
                        if (_bind$12 === undefined) {
                          c = undefined;
                        } else {
                          const _Some = _bind$12;
                          const _lane = _Some;
                          if (spot.against >= 0) {
                            const ids = _M0MPC15array5Array4copyGiE(_lane.ids);
                            _M0MPC15array5Array4pushGiE(ids, spot.against);
                            _M0FP310monkeyfist2mf4core5weaveN5belowS3323(_env$7, ids);
                          } else {
                            _M0FP310monkeyfist2mf4core5weaveN5belowS3323(_env$7, _lane.ids);
                          }
                          if (_M0FP310monkeyfist2mf4core5weaveN4tiedS3324(_env$8, spot.c)) {
                            _return_value$2 = undefined;
                            break _L$5;
                          }
                          const _p$2 = cfg.pull;
                          const _p$3 = spot.room - 1 | 0;
                          const k$2 = 1 + _M0MP310monkeyfist2mf4core3Rng5below(rng, _p$2 < _p$3 ? _p$2 : _p$3) | 0;
                          const _bind$13 = _M0FP310monkeyfist2mf4core5weaveN4walkS3326(_env$9, spot, k$2);
                          if (_bind$13 === undefined) {
                            c = undefined;
                          } else {
                            const _Some$2 = _bind$13;
                            const _x = _Some$2;
                            const _cells = _x._0;
                            const _tail = _x._1;
                            const joined = _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(_cells, k$2, undefined));
                            const _bind$14 = _tail.len;
                            const _bind$15 = _tail.buf;
                            let _tmp$8 = 0;
                            while (true) {
                              const _$2 = _tmp$8;
                              if (_$2 < _bind$14) {
                                const c$2 = _bind$15[_$2];
                                _M0MPC15array5Array4pushGiE(joined, c$2);
                                _tmp$8 = _$2 + 1 | 0;
                                continue;
                              } else {
                                break;
                              }
                            }
                            const first = _M0FP310monkeyfist2mf4core5weaveN8to__pathS3325(xy, joined);
                            const sum = _M0FP310monkeyfist2mf4core5weaveN5trialS3320(_env$4, first, new _M0TPB5ArrayGiE([k$2], 1));
                            c = sum < 0 ? undefined : new _M0TP310monkeyfist2mf4core4Cand(first, undefined, sum - total0.val | 0, _M0FP310monkeyfist2mf4core9bends__of(first), k$2, _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(_cells, 0, k$2)), new _M0TPB5ArrayGiE([], 0));
                          }
                        }
                        break _L$4;
                      }
                      c = _return_value$2;
                    }
                  } else {
                    let _return_value$2;
                    _L$4: {
                      _L$5: {
                        const _bind$12 = _M0FP310monkeyfist2mf4core5weaveN8way__outS3319(_env$3, spot.c % w | 0, spot.c / w | 0, spot.di);
                        if (_bind$12 === undefined) {
                          c = undefined;
                        } else {
                          const _Some = _bind$12;
                          const _lane = _Some;
                          const gap = _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(_lane.cells, 0, spot.gap));
                          _M0FP310monkeyfist2mf4core5weaveN5belowS3323(_env$7, _lane.ids);
                          let _tmp$8;
                          if (_M0FP310monkeyfist2mf4core5weaveN4tiedS3324(_env$8, spot.c)) {
                            _tmp$8 = true;
                          } else {
                            const _p$2 = _M0MPC15array5Array4iterGiE(gap);
                            let _tmp$9;
                            while (true) {
                              const _p$3 = _M0MPB4Iter4nextGiE(_p$2);
                              if (_p$3 === undefined) {
                                _tmp$9 = false;
                                break;
                              } else {
                                const _p$4 = _p$3;
                                const _p$5 = _p$4;
                                if (_M0FP310monkeyfist2mf4core5weaveN4tiedS3324(_env$8, _p$5)) {
                                  _tmp$9 = true;
                                  break;
                                }
                                continue;
                              }
                            }
                            _tmp$8 = !_tmp$9;
                          }
                          if (_tmp$8) {
                            _return_value$2 = undefined;
                            break _L$5;
                          }
                          const _bind$13 = _M0FP310monkeyfist2mf4core5weaveN4walkS3326(_env$9, spot, 0);
                          if (_bind$13 === undefined) {
                            c = undefined;
                          } else {
                            const _Some$2 = _bind$13;
                            const _x = _Some$2;
                            const _cells = _x._0;
                            const path = _M0FP310monkeyfist2mf4core5weaveN8to__pathS3325(xy, _cells);
                            const sum = _M0FP310monkeyfist2mf4core5weaveN5trialS3320(_env$4, path, new _M0TPB5ArrayGiE([], 0));
                            if (sum < 0) {
                              _return_value$2 = undefined;
                              break _L$5;
                            }
                            const id = _M0MP310monkeyfist2mf4core10Intentions3add(ib, path, new _M0TPB5ArrayGiE([], 0));
                            _M0MP310monkeyfist2mf4core10Intentions7set__up(ib);
                            _M0MP310monkeyfist2mf4core7SqBoard5place(b, id, spot.gap);
                            const dead = _M0MP310monkeyfist2mf4core7SqBoard5relax(b);
                            _M0MP310monkeyfist2mf4core10Intentions4drop(ib);
                            c = dead > 0 ? new _M0TP310monkeyfist2mf4core4Cand(path, undefined, sum - total0.val | 0, _M0FP310monkeyfist2mf4core9bends__of(path), 0, new _M0TPB5ArrayGiE([], 0), gap) : undefined;
                          }
                        }
                        break _L$4;
                      }
                      c = _return_value$2;
                    }
                  }
                  const _bind$12 = _M0FP310monkeyfist2mf4core5weaveN4fitsS3327(bend_sum, c, budget);
                  if (_bind$12 === undefined) {
                  } else {
                    const _Some = _bind$12;
                    const _c = _Some;
                    _return_value = _c;
                    break _L$3;
                  }
                  k = k + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              _bind$9 = undefined;
              break _L$2;
            }
            _bind$9 = _return_value;
          }
          let _bind$10;
          if (_bind$9 === undefined) {
            const need = 0 - score | 0;
            const kinds = n === 0 ? kinds_any : budget < 1 ? kinds_plain : desire >= 2 ? kinds_deep : desire >= 1 ? kinds_leaf : kinds_inner;
            const aim = mirrors.keys.len > mirrors_used.val && b.n >= 1;
            let best = undefined;
            let best_miss = 1e+300;
            let _tmp$8 = 0;
            while (true) {
              const k = _tmp$8;
              if (k < 6) {
                _L$3: {
                  let kind;
                  if (aim && k === 0) {
                    kind = 5;
                  } else {
                    const _bind$11 = k % kinds.len | 0;
                    if (_bind$11 < 0 || _bind$11 >= kinds.len) {
                      $panic();
                    }
                    kind = kinds.buf[_bind$11];
                  }
                  const _bind$11 = _M0FP310monkeyfist2mf4core5weaveN4fitsS3327(bend_sum, _M0FP310monkeyfist2mf4core5weaveN9candidateS3322(_env$6, kind, -1), budget);
                  if (_bind$11 === undefined) {
                    break _L$3;
                  } else {
                    const _Some = _bind$11;
                    const _c = _Some;
                    const _p$2 = _c.lane;
                    let lane;
                    if (_p$2 === undefined) {
                      lane = $panic();
                    } else {
                      const _p$3 = _p$2;
                      lane = _p$3;
                    }
                    const lands = need > 0 && ((_c.gain + _c.bends | 0) >= need && (covered.val + _c.path.len | 0) + 0 >= 0.72 * (nn + 0));
                    let reaches;
                    if (aim) {
                      const _p$3 = _M0MPC15array5Array4iterGiE(lane.cells);
                      let _tmp$9;
                      while (true) {
                        const _p$4 = _M0MPB4Iter4nextGiE(_p$3);
                        if (_p$4 === undefined) {
                          _tmp$9 = false;
                          break;
                        } else {
                          const _p$5 = _p$4;
                          const _p$6 = _p$5;
                          if (_M0MP310monkeyfist2mf4core9SqMirrors3has(mirrors, _p$6) && !(_p$6 >>> 0 < mirror_used.length ? mirror_used[_p$6] : $oob())) {
                            _tmp$9 = true;
                            break;
                          }
                          continue;
                        }
                      }
                      reaches = _tmp$9;
                    } else {
                      reaches = false;
                    }
                    const _tmp$9 = Math.abs(_c.gain + 0 - desire) + _M0MP310monkeyfist2mf4core3Rng4next(rng) * 0.6;
                    let _tmp$10;
                    if (desire >= 2) {
                      const _p$3 = lane.free;
                      _tmp$10 = ((_p$3 < 4 ? _p$3 : 4) + 0) * 0.2;
                    } else {
                      _tmp$10 = 0;
                    }
                    const miss = _tmp$9 - _tmp$10 - (lands ? 100 : 0) - (reaches ? 1.5 : 0);
                    if (miss < best_miss) {
                      best = _c;
                      best_miss = miss;
                    }
                  }
                  break _L$3;
                }
                _tmp$8 = k + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            _bind$10 = best;
          } else {
            const _Some = _bind$9;
            const _c = _Some;
            _bind$10 = _c;
          }
          if (_bind$10 === undefined) {
            stuck = stuck + 1 | 0;
            if (stuck > 4) {
              break;
            }
            break _L;
          } else {
            const _Some = _bind$10;
            const _best = _Some;
            stuck = 0;
            _M0FP310monkeyfist2mf4core5weaveN6commitS3321(_env$5, _best);
          }
          break _L;
        }
        _tmp$3 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let _tmp$4 = 0;
    while (true) {
      const _ = _tmp$4;
      if (_ < 2) {
        const empty = new _M0TPB5ArrayGiE([], 0);
        let _tmp$5 = 0;
        while (true) {
          const c = _tmp$5;
          if (c < nn) {
            if ((c >>> 0 < occ.length ? occ[c] : $oob()) === -1) {
              _M0MPC15array5Array4pushGiE(empty, c);
            }
            _tmp$5 = c + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let _tmp$6 = empty.len - 1 | 0;
        while (true) {
          const i = _tmp$6;
          if (i > 0) {
            const j = _M0MP310monkeyfist2mf4core3Rng5below(rng, i + 1 | 0);
            if (i < 0 || i >= empty.len) {
              $panic();
            }
            const t = empty.buf[i];
            if (j < 0 || j >= empty.len) {
              $panic();
            }
            const _bind$5 = empty.buf[j];
            if (i < 0 || i >= empty.len) {
              $panic();
            }
            empty.buf[i] = _bind$5;
            if (j < 0 || j >= empty.len) {
              $panic();
            }
            empty.buf[j] = t;
            _tmp$6 = i - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const _bind$5 = empty.len;
        const _bind$6 = empty.buf;
        let _tmp$7 = 0;
        while (true) {
          const _$2 = _tmp$7;
          if (_$2 < _bind$5) {
            const cell = _bind$6[_$2];
            _L: {
              if ((cell >>> 0 < occ.length ? occ[cell] : $oob()) !== -1) {
                break _L;
              }
              const budget = (999999 - total0.val | 0) - bend_sum.val | 0;
              let _tmp$8 = 0;
              while (true) {
                const _$3 = _tmp$8;
                if (_$3 < 3) {
                  _L$2: {
                    const _bind$7 = _M0FP310monkeyfist2mf4core5weaveN9candidateS3322(_env$6, budget < 1 ? 4 : 3, cell);
                    if (_bind$7 === undefined) {
                      break _L$2;
                    } else {
                      const _Some = _bind$7;
                      const _c = _Some;
                      if ((_c.gain + _c.bends | 0) > budget || (bend_sum.val + _c.bends | 0) > 999999) {
                        break _L$2;
                      }
                      _M0FP310monkeyfist2mf4core5weaveN6commitS3321(_env$5, _c);
                      break;
                    }
                  }
                  _tmp$8 = _$3 + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              break _L;
            }
            _tmp$7 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp$4 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const n = b.n;
    if (n < 3 || !_M0MP310monkeyfist2mf4core10Intentions6replay(ib, order.val, -1)) {
      return undefined;
    }
    return _M0FP310monkeyfist2mf4core8finished(cfg, ib);
  }
  function _M0MP310monkeyfist2mf4core5Board13with__springs(self, springs, plan) {
    return new _M0TP310monkeyfist2mf4core5Board(self.hex, self.w, self.h, self.ropes, self.mirrors, springs, plan);
  }
  function _M0MP310monkeyfist2mf4core5Board10with__plan(self, plan) {
    return new _M0TP310monkeyfist2mf4core5Board(self.hex, self.w, self.h, self.ropes, self.mirrors, self.springs, plan);
  }
  function _M0MP310monkeyfist2mf4core9SqMirrors5empty() {
    return new _M0TP310monkeyfist2mf4core9SqMirrors([], new _M0TPB5ArrayGiE([], 0));
  }
  function _M0MP310monkeyfist2mf4core9SqMirrors3set(self, c, s) {
    const _tmp = self.slope;
    if ((c >>> 0 < _tmp.length ? _tmp[c] : $oob()) < 0) {
      _M0MPC15array5Array4pushGiE(self.keys, c);
    }
    const _tmp$2 = self.slope;
    if (c >>> 0 < _tmp$2.length) {
      _tmp$2[c] = s;
    } else {
      $oob();
    }
  }
  function _M0MP310monkeyfist2mf4core9SqMirrors9of__board(b) {
    const m = new _M0TP310monkeyfist2mf4core9SqMirrors($make_array_len_and_init(Math.imul(b.w, b.h) | 0, -1), new _M0TPB5ArrayGiE([], 0));
    const _bind = b.mirrors;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const x = _bind$3[_];
        _M0MP310monkeyfist2mf4core9SqMirrors3set(m, (Math.imul(x.cell.r, b.w) | 0) + x.cell.q | 0, x.kind);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return m;
  }
  function _M0MP310monkeyfist2mf4core7SqBoard9all__free(b) {
    const _bind = b.n;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        let _tmp$2;
        const _tmp$3 = b.off;
        if ((i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) >= 0) {
          _tmp$2 = _M0MP310monkeyfist2mf4core7SqBoard9slide__to(b, i) >= 0;
        } else {
          _tmp$2 = false;
        }
        if (_tmp$2) {
          return false;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return true;
  }
  function _M0FP310monkeyfist2mf4core7key__of(a) {
    const sb = _M0MPB13StringBuilder21StringBuilder_2einner(8);
    const _bind = a.length;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const x = a[_];
        _M0IPB13StringBuilderPB6Logger11write__char(sb, x + 1 | 0);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return sb.val;
  }
  function _M0FP310monkeyfist2mf4core9sq__solveN6searchS3904(_env) {
    const later = _env._8;
    const limit = _env._7;
    const rank = _env._6;
    const n = _env._5;
    const b = _env._4;
    const moves = _env._3;
    const gave_up = _env._2;
    const hopeless = _env._1;
    const nodes = _env._0;
    if (b.left === 0) {
      return true;
    }
    nodes.val = nodes.val + 1 | 0;
    if (nodes.val > limit) {
      gave_up.val = true;
      return false;
    }
    const key = _M0FP310monkeyfist2mf4core7key__of(b.off);
    if (_M0MPB3Map8containsGsbE(hopeless, key)) {
      return false;
    }
    if (_M0MP310monkeyfist2mf4core7SqBoard5relax(b) > 0) {
      _M0MPB3Map3setGsbE(hopeless, key, true);
      return false;
    }
    const tries = new _M0TPB5ArrayGUiiiEE([], 0);
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < n) {
        _L: {
          const _tmp$2 = b.off;
          if ((i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob()) < 0) {
            break _L;
          }
          const to = _M0MP310monkeyfist2mf4core7SqBoard9slide__to(b, i);
          const _tmp$3 = b.off;
          if (to !== (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob())) {
            let r;
            const _tmp$4 = b.off;
            if ((i >>> 0 < _tmp$4.length ? _tmp$4[i] : $oob()) !== 0) {
              r = i >>> 0 < later.length ? later[i] : $oob();
            } else {
              r = i >>> 0 < rank.length ? rank[i] : $oob();
            }
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(tries, { _0: i, _1: to, _2: (Math.imul(r, 2) | 0) + (to < 0 ? 0 : 1) | 0 });
          }
          break _L;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0FP310monkeyfist2mf4core5ssortGUiiEE(tries, (x, y) => x._2 !== y._2 ? x._2 - y._2 | 0 : x._0 - y._0 | 0);
    const _bind = tries.len;
    const _bind$2 = tries.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind) {
        const t = _bind$2[_];
        const _tmp$3 = b.off;
        const _tmp$4 = t._0;
        const from = _tmp$4 >>> 0 < _tmp$3.length ? _tmp$3[_tmp$4] : $oob();
        _M0MP310monkeyfist2mf4core7SqBoard5place(b, t._0, t._1);
        _M0MPC15array5Array4pushGiE(moves, t._0);
        if (_M0FP310monkeyfist2mf4core9sq__solveN6searchS3904(_env)) {
          return true;
        }
        _M0MPC15array5Array3popGiE(moves);
        _M0MP310monkeyfist2mf4core7SqBoard5place(b, t._0, from);
        if (gave_up.val) {
          return false;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MPB3Map3setGsbE(hopeless, key, true);
    return false;
  }
  function _M0FP310monkeyfist2mf4core9sq__solve(paths, w, h, budget, prefer, m) {
    const b = _M0FP310monkeyfist2mf4core14sq__board__exn(paths, w, h, m);
    const n = b.n;
    const _bind = [];
    const hopeless = _M0MPB3Map3MapGsbE(new _M0TPB9ArrayViewGUsbEE(_bind, 0, 0), undefined);
    const moves = new _M0TPB5ArrayGiE([], 0);
    const limit = budget === 0 ? 20000 : budget;
    const rank = $make_array_len_and_init(n, 1000000);
    const later = $make_array_len_and_init(n, 1000000);
    const _bind$2 = prefer.len;
    const _bind$3 = prefer.buf;
    let _tmp = 0;
    while (true) {
      const k = _tmp;
      if (k < _bind$2) {
        const i = _bind$3[k];
        if (i >= 0 && i < n) {
          if ((i >>> 0 < rank.length ? rank[i] : $oob()) === 1000000) {
            if (i >>> 0 < rank.length) {
              rank[i] = k;
            } else {
              $oob();
            }
          }
          if (i >>> 0 < later.length) {
            later[i] = k;
          } else {
            $oob();
          }
        }
        _tmp = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const nodes = new _M0TPB8MutLocalGiE(0);
    const gave_up = new _M0TPB8MutLocalGbE(false);
    const _env = { _0: nodes, _1: hopeless, _2: gave_up, _3: moves, _4: b, _5: n, _6: rank, _7: limit, _8: later };
    const solved = _M0FP310monkeyfist2mf4core9sq__solveN6searchS3904(_env);
    return new _M0TP310monkeyfist2mf4core6Solved(solved ? _M0FP310monkeyfist2mf4core9sq__solveN6constrS3905 : gave_up.val ? -1 : _M0FP310monkeyfist2mf4core9sq__solveN6constrS3906, moves, nodes.val);
  }
  function _M0FP310monkeyfist2mf4core16sq__player__taps(paths, w, h, taps, m) {
    const b = _M0FP310monkeyfist2mf4core14sq__board__exn(paths, w, h, m);
    let count = 0;
    let auto = false;
    const _bind = taps.len;
    const _bind$2 = taps.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const i = _bind$2[_];
        _L: {
          const _tmp$2 = b.off;
          if ((i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob()) < 0) {
            break _L;
          }
          const to = _M0MP310monkeyfist2mf4core7SqBoard9slide__to(b, i);
          const _tmp$3 = b.off;
          if (to === (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob())) {
            return undefined;
          }
          if (!auto) {
            count = count + 1 | 0;
          }
          _M0MP310monkeyfist2mf4core7SqBoard5place(b, i, to);
          if (!auto && _M0MP310monkeyfist2mf4core7SqBoard9all__free(b)) {
            auto = true;
          }
          break _L;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return b.left > 0 ? undefined : count;
  }
  function _M0FP310monkeyfist2mf4core24sq__fewest__player__tapsN5boundS3970(_env) {
    const blockers = _env._1;
    const b = _env._0;
    _M0MPC15array10FixedArray12fill_2einnerGbE(blockers, false, 0, undefined);
    let total = 0;
    const _bind = b.n;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const _tmp$2 = b.off;
        if ((i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob()) >= 0) {
          const _bind$2 = b.seq;
          if (i < 0 || i >= _bind$2.len) {
            $panic();
          }
          const seq = _bind$2.buf[i];
          const _tmp$3 = b.off;
          const _tmp$4 = i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob();
          const _tmp$5 = b.len;
          const _bind$3 = _tmp$4 + (i >>> 0 < _tmp$5.length ? _tmp$5[i] : $oob()) | 0;
          const _bind$4 = seq.length;
          let _tmp$6 = _bind$3;
          while (true) {
            const p = _tmp$6;
            if (p < _bind$4) {
              const _tmp$7 = b.occ;
              const _tmp$8 = p >>> 0 < seq.length ? seq[p] : $oob();
              const z = _tmp$8 >>> 0 < _tmp$7.length ? _tmp$7[_tmp$8] : $oob();
              if (z >= 0 && !(z >>> 0 < blockers.length ? blockers[z] : $oob())) {
                if (z >>> 0 < blockers.length) {
                  blockers[z] = true;
                } else {
                  $oob();
                }
                total = total + 1 | 0;
              }
              _tmp$6 = p + 1 | 0;
              continue;
            } else {
              break;
            }
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return total;
  }
  function _M0FP310monkeyfist2mf4core24sq__fewest__player__tapsN6searchS3971(_env, remaining) {
    const limit = _env._8;
    const gave_up = _env._7;
    const _env$2 = _env._6;
    const tried = _env._5;
    const b = _env._4;
    const moves = _env._3;
    const later = _env._2;
    const nodes = _env._1;
    const rank = _env._0;
    if (_M0MP310monkeyfist2mf4core7SqBoard9all__free(b)) {
      return true;
    }
    if (remaining === 0 || _M0FP310monkeyfist2mf4core24sq__fewest__player__tapsN5boundS3970(_env$2) > remaining) {
      return false;
    }
    nodes.val = nodes.val + 1 | 0;
    if (nodes.val > limit) {
      gave_up.val = true;
      return false;
    }
    const key = _M0FP310monkeyfist2mf4core7key__of(b.off);
    const _bind = _M0MPB3Map3getGsiE(tried, key);
    if (_bind === undefined) {
    } else {
      const _Some = _bind;
      const _t = _Some;
      if (_t >= remaining) {
        return false;
      }
    }
    if (_M0MP310monkeyfist2mf4core7SqBoard5relax(b) > 0) {
      _M0MPB3Map3setGsiE(tried, key, 1000000);
      return false;
    }
    const choices = new _M0TPB5ArrayGUiiiEE([], 0);
    const _bind$2 = b.n;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind$2) {
        const _tmp$2 = b.off;
        if ((i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob()) >= 0) {
          const to = _M0MP310monkeyfist2mf4core7SqBoard9slide__to(b, i);
          const _tmp$3 = b.off;
          if (to !== (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob())) {
            let _tmp$4;
            const _tmp$5 = b.off;
            if ((i >>> 0 < _tmp$5.length ? _tmp$5[i] : $oob()) !== 0) {
              _tmp$4 = i >>> 0 < later.length ? later[i] : $oob();
            } else {
              _tmp$4 = i >>> 0 < rank.length ? rank[i] : $oob();
            }
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(choices, { _0: i, _1: to, _2: _tmp$4 });
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0FP310monkeyfist2mf4core5ssortGUiiEE(choices, (x, y) => x._2 !== y._2 ? x._2 - y._2 | 0 : x._0 - y._0 | 0);
    const _bind$3 = choices.len;
    const _bind$4 = choices.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$3) {
        const t = _bind$4[_];
        const _tmp$3 = b.off;
        const _tmp$4 = t._0;
        const from = _tmp$4 >>> 0 < _tmp$3.length ? _tmp$3[_tmp$4] : $oob();
        _M0MP310monkeyfist2mf4core7SqBoard5place(b, t._0, t._1);
        _M0MPC15array5Array4pushGiE(moves, t._0);
        if (_M0FP310monkeyfist2mf4core24sq__fewest__player__tapsN6searchS3971(_env, remaining - 1 | 0)) {
          return true;
        }
        _M0MPC15array5Array3popGiE(moves);
        _M0MP310monkeyfist2mf4core7SqBoard5place(b, t._0, from);
        if (gave_up.val) {
          return false;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MPB3Map3setGsiE(tried, key, remaining);
    return false;
  }
  function _M0FP310monkeyfist2mf4core24sq__fewest__player__taps(paths, w, h, known, budget, m) {
    const _bind = _M0FP310monkeyfist2mf4core16sq__player__taps(paths, w, h, known, m);
    let count;
    if (_bind === undefined) {
      return undefined;
    } else {
      const _Some = _bind;
      count = _Some;
    }
    const b = _M0FP310monkeyfist2mf4core14sq__board__exn(paths, w, h, m);
    const limit = budget === 0 ? 6000 : budget;
    const moves = new _M0TPB5ArrayGiE([], 0);
    const _bind$2 = [];
    const tried = _M0MPB3Map3MapGsiE(new _M0TPB9ArrayViewGUsiEE(_bind$2, 0, 0), undefined);
    const rank = $make_array_len_and_init(b.n, 1000000);
    const later = $make_array_len_and_init(b.n, 1000000);
    const _bind$3 = known.len;
    const _bind$4 = known.buf;
    let _tmp = 0;
    while (true) {
      const k = _tmp;
      if (k < _bind$3) {
        const i = _bind$4[k];
        if ((i >>> 0 < rank.length ? rank[i] : $oob()) === 1000000) {
          if (i >>> 0 < rank.length) {
            rank[i] = k;
          } else {
            $oob();
          }
        }
        if (i >>> 0 < later.length) {
          later[i] = k;
        } else {
          $oob();
        }
        _tmp = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const nodes = new _M0TPB8MutLocalGiE(0);
    const gave_up = new _M0TPB8MutLocalGbE(false);
    const blockers = $make_array_len_and_init(b.n, false);
    const _env = { _0: b, _1: blockers };
    const _p = b.left > 0 ? 1 : 0;
    const _p$2 = _M0FP310monkeyfist2mf4core24sq__fewest__player__tapsN5boundS3970(_env);
    const lower = _p > _p$2 ? _p : _p$2;
    const _env$2 = { _0: rank, _1: nodes, _2: later, _3: moves, _4: b, _5: tried, _6: _env, _7: gave_up, _8: limit };
    let k = lower;
    while (true) {
      if (k < count && !gave_up.val) {
        if (_M0FP310monkeyfist2mf4core24sq__fewest__player__tapsN6searchS3971(_env$2, k)) {
          const manual = moves.len;
          const _bind$5 = b.n;
          let _tmp$2 = 0;
          while (true) {
            const i = _tmp$2;
            if (i < _bind$5) {
              const _tmp$3 = b.off;
              if ((i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) >= 0) {
                _M0MPC15array5Array4pushGiE(moves, i);
              }
              _tmp$2 = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          return new _M0TP310monkeyfist2mf4core3Par(moves, manual, true);
        }
        k = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core3Par(_M0MPC15array5Array4copyGiE(known), count, !gave_up.val);
  }
  function _M0FP310monkeyfist2mf4core10sq__replay(paths, w, h, taps, m) {
    const b = _M0FP310monkeyfist2mf4core14sq__board__exn(paths, w, h, m);
    const events = new _M0TPB5ArrayGiE([], 0);
    let count = 0;
    let auto = false;
    const _bind = taps.len;
    const _bind$2 = taps.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const i = _bind$2[_];
        let to;
        const _tmp$2 = b.off;
        if ((i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob()) < 0) {
          const _tmp$3 = b.off;
          to = i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob();
        } else {
          to = _M0MP310monkeyfist2mf4core7SqBoard9slide__to(b, i);
        }
        const _tmp$3 = b.off;
        if (to === (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob())) {
          return new _M0TP310monkeyfist2mf4core8Replayed(false, count, events, _M0MP310monkeyfist2mf4core7SqBoard5paths(b, w));
        }
        if (!auto) {
          count = count + 1 | 0;
        }
        _M0MP310monkeyfist2mf4core7SqBoard5place(b, i, to);
        _M0MPC15array5Array4pushGiE(events, to < 0 ? 0 : 2);
        if (_M0MP310monkeyfist2mf4core7SqBoard9all__free(b)) {
          auto = true;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core8Replayed(b.left === 0, count, events, _M0MP310monkeyfist2mf4core7SqBoard5paths(b, w));
  }
  function _M0FP310monkeyfist2mf4core8sq__free(paths, w, h, m) {
    return _M0MP310monkeyfist2mf4core7SqBoard9all__free(_M0FP310monkeyfist2mf4core14sq__board__exn(paths, w, h, m));
  }
  function _M0FP310monkeyfist2mf4core10sq__tracks(paths, w, h, m) {
    const _bind = _M0FP310monkeyfist2mf4core9sq__board(paths, w, h, m);
    if (_bind === undefined) {
      return undefined;
    } else {
      const _Some = _bind;
      const _b = _Some;
      return _b.seq;
    }
  }
  function _M0FP310monkeyfist2mf4core19sq__postpone__exits(paths, w, h, taps, m) {
    let best = _M0MPC15array5Array4copyGiE(taps);
    const _bind = _M0FP310monkeyfist2mf4core16sq__player__taps(paths, w, h, best, m);
    let count;
    if (_bind === undefined) {
      return undefined;
    } else {
      const _Some = _bind;
      count = _Some;
    }
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < 2) {
        let improved = false;
        let _tmp$2 = best.len - 1 | 0;
        while (true) {
          const k = _tmp$2;
          if (k >= 0) {
            _L: {
              const _bind$2 = best;
              if (k < 0 || k >= _bind$2.len) {
                $panic();
              }
              const i = _bind$2.buf[k];
              if (_M0FP310monkeyfist2mf4core11index__from(best, i, k + 1 | 0) >= 0) {
                break _L;
              }
              const trial = _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(best, 0, k));
              const _bind$3 = k + 1 | 0;
              const _bind$4 = best.len;
              let _tmp$3 = _bind$3;
              while (true) {
                const j = _tmp$3;
                if (j < _bind$4) {
                  const _bind$5 = best;
                  if (j < 0 || j >= _bind$5.len) {
                    $panic();
                  }
                  _M0MPC15array5Array4pushGiE(trial, _bind$5.buf[j]);
                  _tmp$3 = j + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              _M0MPC15array5Array4pushGiE(trial, i);
              const _bind$5 = _M0FP310monkeyfist2mf4core16sq__player__taps(paths, w, h, trial, m);
              if (_bind$5 === undefined) {
              } else {
                const _Some = _bind$5;
                const _c = _Some;
                if (_c < count) {
                  best = trial;
                  count = _c;
                  improved = true;
                }
              }
              break _L;
            }
            _tmp$2 = k - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        if (!improved) {
          break;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return best;
  }
  function _M0FP310monkeyfist2mf4core16sq__casual__wins(paths, w, h, rng, games, m) {
    const b = _M0FP310monkeyfist2mf4core14sq__board__exn(paths, w, h, m);
    const exits = new _M0TPB5ArrayGiE([], 0);
    const moves = new _M0TPB5ArrayGiE([], 0);
    let wins = 0;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < games) {
        _M0MPC15array10FixedArray12fill_2einnerGiE(b.occ, -1, 0, undefined);
        b.left = 0;
        const _bind = b.n;
        let _tmp$2 = 0;
        while (true) {
          const i = _tmp$2;
          if (i < _bind) {
            const _tmp$3 = b.off;
            if (i >>> 0 < _tmp$3.length) {
              _tmp$3[i] = -1;
            } else {
              $oob();
            }
            _M0MP310monkeyfist2mf4core7SqBoard5place(b, i, 0);
            _tmp$2 = i + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        while (true) {
          _M0MPC15array5Array5clearGiE(exits);
          _M0MPC15array5Array5clearGiE(moves);
          const _bind$2 = b.n;
          let _tmp$3 = 0;
          while (true) {
            const i = _tmp$3;
            if (i < _bind$2) {
              const _tmp$4 = b.off;
              if ((i >>> 0 < _tmp$4.length ? _tmp$4[i] : $oob()) >= 0) {
                const to = _M0MP310monkeyfist2mf4core7SqBoard9slide__to(b, i);
                if (to < 0) {
                  _M0MPC15array5Array4pushGiE(exits, i);
                } else {
                  const _tmp$5 = b.off;
                  if (to !== (i >>> 0 < _tmp$5.length ? _tmp$5[i] : $oob())) {
                    _M0MPC15array5Array4pushGiE(moves, i);
                    _M0MPC15array5Array4pushGiE(moves, to);
                  }
                }
              }
              _tmp$3 = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if (exits.len > 0) {
            const _bind$3 = _M0MP310monkeyfist2mf4core3Rng5below(rng, exits.len);
            if (_bind$3 < 0 || _bind$3 >= exits.len) {
              $panic();
            }
            _M0MP310monkeyfist2mf4core7SqBoard5place(b, exits.buf[_bind$3], -1);
          } else {
            if (moves.len > 0) {
              const k = Math.imul(2, _M0MPC16double6Double7to__int(_M0MPC16double6Double5floor(_M0MP310monkeyfist2mf4core3Rng4next(rng) * (moves.len + 0) / 2))) | 0;
              if (k < 0 || k >= moves.len) {
                $panic();
              }
              const _tmp$4 = moves.buf[k];
              const _bind$3 = k + 1 | 0;
              if (_bind$3 < 0 || _bind$3 >= moves.len) {
                $panic();
              }
              _M0MP310monkeyfist2mf4core7SqBoard5place(b, _tmp$4, moves.buf[_bind$3]);
            } else {
              break;
            }
          }
          if (b.left === 0) {
            wins = wins + 1 | 0;
            break;
          }
          continue;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return (wins + 0) / ((1 > games ? 1 : games) + 0);
  }
  function _M0FP310monkeyfist2mf4core10mulberry32(seed) {
    return new _M0TP310monkeyfist2mf4core3Rng(seed);
  }
  function _M0FP310monkeyfist2mf4core12hash__string(s) {
    let h = -2128831035;
    const _bind = s.length;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        h = Math.imul(h ^ (i >>> 0 < s.length ? s.charCodeAt(i) : $oob()), 16777619) | 0;
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return h;
  }
  function _M0FP310monkeyfist2mf4core7rng__of(s) {
    return _M0FP310monkeyfist2mf4core10mulberry32(_M0FP310monkeyfist2mf4core12hash__string(s));
  }
  function _M0FP310monkeyfist2mf4core6base36(u) {
    return _M0MPC14uint4UInt18to__string_2einner(u, 36);
  }
  function _M0FP310monkeyfist2mf4core10floor__div(a, b) {
    return a >= 0 ? a / b | 0 : -((((-a | 0) + b | 0) - 1 | 0) / b | 0) | 0;
  }
  function _M0FP310monkeyfist2mf4core15hex__dir__index(dq, dr) {
    let _tmp = 0;
    while (true) {
      const d = _tmp;
      if (d < 6) {
        if ((d >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[d] : $oob()) === dq && (d >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[d] : $oob()) === dr) {
          return d;
        }
        _tmp = d + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return -1;
  }
  function _M0FP310monkeyfist2mf4core9hex__cell(p, w) {
    return ((Math.imul(p.r, w) | 0) + p.q | 0) + _M0FP310monkeyfist2mf4core10floor__div(p.r, 2) | 0;
  }
  function _M0MP310monkeyfist2mf4core3Geo4cell(self, p) {
    return self.hex ? _M0FP310monkeyfist2mf4core9hex__cell(p, self.w) : (Math.imul(p.r, self.w) | 0) + p.q | 0;
  }
  function _M0MP310monkeyfist2mf4core3Geo9direction(self, path) {
    const _bind = _M0FP310monkeyfist2mf4core9head__dir(path);
    const _dq = _bind._0;
    const _dr = _bind._1;
    const _tmp = self.mirror;
    const _tmp$2 = _M0MP310monkeyfist2mf4core3Geo4cell(self, _M0FP310monkeyfist2mf4core4last(path));
    const m = _tmp$2 >>> 0 < _tmp.length ? _tmp[_tmp$2] : $oob();
    if (m < 0) {
      return { _0: _dq, _1: _dr };
    } else {
      if (self.hex) {
        const _p = _M0FP310monkeyfist2mf4core15hex__dir__index(_dq, _dr);
        const d = ((((Math.imul(2, m) | 0) - _p | 0) % 6 | 0) + 6 | 0) % 6 | 0;
        return { _0: d >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[d] : $oob(), _1: d >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[d] : $oob() };
      } else {
        return _M0FP310monkeyfist2mf4core4turn(m, _dq, _dr);
      }
    }
  }
  function _M0FP310monkeyfist2mf4core11hex__inside(w, h, p) {
    return p.r >= 0 && (p.r < h && ((p.q + _M0FP310monkeyfist2mf4core10floor__div(p.r, 2) | 0) >= 0 && (p.q + _M0FP310monkeyfist2mf4core10floor__div(p.r, 2) | 0) < w));
  }
  function _M0MP310monkeyfist2mf4core3Geo6inside(self, p) {
    return self.hex ? _M0FP310monkeyfist2mf4core11hex__inside(self.w, self.h, p) : p.q >= 0 && (p.r >= 0 && (p.q < self.w && p.r < self.h));
  }
  function _M0MP310monkeyfist2mf4core3Geo4mark(self, paths) {
    self.stamp = self.stamp + 1 | 0;
    const s = self.stamp;
    const _bind = paths.len;
    const _bind$2 = paths.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const p = _bind$2[_];
        if (p === undefined) {
        } else {
          const _Some = p;
          const _path = _Some;
          const _bind$3 = _path.len;
          const _bind$4 = _path.buf;
          let _tmp$2 = 0;
          while (true) {
            const _$2 = _tmp$2;
            if (_$2 < _bind$3) {
              const c = _bind$4[_$2];
              const _tmp$3 = self.occ;
              const _tmp$4 = _M0MP310monkeyfist2mf4core3Geo4cell(self, c);
              if (_tmp$4 >>> 0 < _tmp$3.length) {
                _tmp$3[_tmp$4] = s;
              } else {
                $oob();
              }
              _tmp$2 = _$2 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return s;
  }
  function _M0FP310monkeyfist2mf4core8snapshot(g, paths) {
    const s = _M0MP310monkeyfist2mf4core3Geo4mark(g, paths);
    const owner = $make_array_len_and_init(Math.imul(g.w, g.h) | 0, -1);
    const _bind = paths.len;
    const _bind$2 = paths.buf;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const p = _bind$2[i];
        if (p === undefined) {
        } else {
          const _Some = p;
          const _path = _Some;
          const _bind$3 = _path.len;
          const _bind$4 = _path.buf;
          let _tmp$2 = 0;
          while (true) {
            const _ = _tmp$2;
            if (_ < _bind$3) {
              const c = _bind$4[_];
              const _tmp$3 = _M0MP310monkeyfist2mf4core3Geo4cell(g, c);
              if (_tmp$3 >>> 0 < owner.length) {
                owner[_tmp$3] = i;
              } else {
                $oob();
              }
              _tmp$2 = _ + 1 | 0;
              continue;
            } else {
              break;
            }
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const seen = new _M0TPB5ArrayGiE([], 0);
    const _p = _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(paths.len);
    const _p$2 = paths.len;
    const _p$3 = paths.buf;
    let _tmp$2 = 0;
    while (true) {
      const _p$4 = _tmp$2;
      if (_p$4 < _p$2) {
        const _p$5 = _p$3[_p$4];
        let _p$6;
        let _p$7;
        _L: {
          _L$2: {
            if (_p$5 === undefined) {
              _p$6 = undefined;
            } else {
              const _p$8 = _p$5;
              const _p$9 = _p$8;
              let _p$10 = _M0FP310monkeyfist2mf4core4last(_p$9);
              const _p$11 = _M0MP310monkeyfist2mf4core3Geo9direction(g, _p$9);
              const _p$12 = _p$11._0;
              const _p$13 = _p$11._1;
              let _p$14 = _p$12;
              let _p$15 = _p$13;
              let _p$16 = 0;
              _M0MPC15array5Array5clearGiE(seen);
              const _p$17 = Math.imul(Math.imul(g.w, g.h) | 0, 6) | 0;
              let _tmp$3 = 0;
              let _tmp$4 = 0 <= _p$17;
              while (true) {
                const _p$18 = _tmp$3;
                const _p$19 = _tmp$4;
                if (_p$19) {
                  const _p$20 = new _M0TP310monkeyfist2mf4core2Pt(_p$10.q + _p$14 | 0, _p$10.r + _p$15 | 0);
                  if (!_M0MP310monkeyfist2mf4core3Geo6inside(g, _p$20)) {
                    _p$7 = new _M0TP310monkeyfist2mf4core4Snap(0, _p$16, -1);
                    break _L$2;
                  }
                  const _p$21 = _M0MP310monkeyfist2mf4core3Geo4cell(g, _p$20);
                  const _tmp$5 = g.occ;
                  if ((_p$21 >>> 0 < _tmp$5.length ? _tmp$5[_p$21] : $oob()) === s) {
                    _p$7 = new _M0TP310monkeyfist2mf4core4Snap(1, _p$16, _p$21 >>> 0 < owner.length ? owner[_p$21] : $oob());
                    break _L$2;
                  }
                  const _p$22 = g.hex ? _p$21 : ((Math.imul(((Math.imul(_p$21, 3) | 0) + _p$14 | 0) + 1 | 0, 3) | 0) + _p$15 | 0) + 1 | 0;
                  if (_M0FP310monkeyfist2mf4core8contains(seen, _p$22)) {
                    _p$7 = _M0FP310monkeyfist2mf4core8snapshotN6constrS4172;
                    break _L$2;
                  }
                  _M0MPC15array5Array4pushGiE(seen, _p$22);
                  _p$16 = _p$16 + 1 | 0;
                  _p$10 = _p$20;
                  const _tmp$6 = g.spring;
                  if (_p$21 >>> 0 < _tmp$6.length ? _tmp$6[_p$21] : $oob()) {
                    _p$7 = new _M0TP310monkeyfist2mf4core4Snap(3, _p$16, -1);
                    break _L$2;
                  }
                  const _tmp$7 = g.mirror;
                  const _p$23 = _p$21 >>> 0 < _tmp$7.length ? _tmp$7[_p$21] : $oob();
                  if (_p$23 >= 0) {
                    if (g.hex) {
                      const _p$24 = _M0FP310monkeyfist2mf4core15hex__dir__index(_p$14, _p$15);
                      const _p$25 = ((((Math.imul(2, _p$23) | 0) - _p$24 | 0) % 6 | 0) + 6 | 0) % 6 | 0;
                      _p$14 = _p$25 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[_p$25] : $oob();
                      _p$15 = _p$25 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[_p$25] : $oob();
                    } else {
                      const _p$24 = _M0FP310monkeyfist2mf4core4turn(_p$23, _p$14, _p$15);
                      const _p$25 = _p$24._0;
                      const _p$26 = _p$24._1;
                      _p$14 = _p$25;
                      _p$15 = _p$26;
                    }
                  }
                  _tmp$3 = _p$18 + 1 | 0;
                  _tmp$4 = _p$18 < _p$17;
                  continue;
                } else {
                  break;
                }
              }
              _p$6 = _M0FP310monkeyfist2mf4core8snapshotN6constrS4174;
            }
            break _L;
          }
          _p$6 = _p$7;
        }
        _p.buf[_p$4] = _p$6;
        _tmp$2 = _p$4 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return _p;
  }
  function _M0FP310monkeyfist2mf4core9to__fixed(x, digits) {
    let scale = 1;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < digits) {
        scale = scale * 10;
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const y = x * scale;
    const f = _M0MPC16double6Double5floor(y);
    const n = y - f >= 0.5 ? f + 1 : f;
    return n / scale;
  }
  function _M0FP310monkeyfist2mf4core18graph__interactionN5visitS4222(_env, v) {
    const components = _env._7;
    const dependents = _env._6;
    const component = _env._5;
    const on_stack = _env._4;
    const low = _env._3;
    const indices = _env._2;
    const next_index = _env._1;
    const stack = _env._0;
    if (v >>> 0 < indices.length) {
      indices[v] = next_index.val;
    } else {
      $oob();
    }
    if (v >>> 0 < low.length) {
      low[v] = next_index.val;
    } else {
      $oob();
    }
    next_index.val = next_index.val + 1 | 0;
    _M0MPC15array5Array4pushGiE(stack, v);
    if (v >>> 0 < on_stack.length) {
      on_stack[v] = true;
    } else {
      $oob();
    }
    if (v < 0 || v >= dependents.len) {
      $panic();
    }
    const _bind = dependents.buf[v];
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const x = _bind$3[_];
        if ((x >>> 0 < indices.length ? indices[x] : $oob()) < 0) {
          _M0FP310monkeyfist2mf4core18graph__interactionN5visitS4222(_env, x);
          const _p = v >>> 0 < low.length ? low[v] : $oob();
          const _p$2 = x >>> 0 < low.length ? low[x] : $oob();
          if (v >>> 0 < low.length) {
            low[v] = _p < _p$2 ? _p : _p$2;
          } else {
            $oob();
          }
        } else {
          if (x >>> 0 < on_stack.length ? on_stack[x] : $oob()) {
            const _p = v >>> 0 < low.length ? low[v] : $oob();
            const _p$2 = x >>> 0 < indices.length ? indices[x] : $oob();
            if (v >>> 0 < low.length) {
              low[v] = _p < _p$2 ? _p : _p$2;
            } else {
              $oob();
            }
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    if ((v >>> 0 < low.length ? low[v] : $oob()) !== (v >>> 0 < indices.length ? indices[v] : $oob())) {
      return undefined;
    }
    const group = new _M0TPB5ArrayGiE([], 0);
    while (true) {
      const _p = _M0MPC15array5Array3popGiE(stack);
      let x;
      if (_p === undefined) {
        x = $panic();
      } else {
        const _p$2 = _p;
        x = _p$2;
      }
      if (x >>> 0 < on_stack.length) {
        on_stack[x] = false;
      } else {
        $oob();
      }
      if (x >>> 0 < component.length) {
        component[x] = components.len;
      } else {
        $oob();
      }
      _M0MPC15array5Array4pushGiE(group, x);
      if (x === v) {
        break;
      }
      continue;
    }
    _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(components, group);
  }
  function _M0FP310monkeyfist2mf4core18graph__interaction(dependents, n, revisited) {
    let prerequisites;
    if (n <= 0) {
      prerequisites = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(n);
      let _tmp = 0;
      while (true) {
        const _p$2 = _tmp;
        if (_p$2 < n) {
          const _p$3 = new _M0TPB5ArrayGiE([], 0);
          _p.buf[_p$2] = _p$3;
          _tmp = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      prerequisites = _p;
    }
    let _tmp = 0;
    while (true) {
      const from = _tmp;
      if (from < n) {
        if (from < 0 || from >= dependents.len) {
          $panic();
        }
        const _bind = dependents.buf[from];
        const _bind$2 = _bind.len;
        const _bind$3 = _bind.buf;
        let _tmp$2 = 0;
        while (true) {
          const _ = _tmp$2;
          if (_ < _bind$2) {
            const to = _bind$3[_];
            if (to < 0 || to >= prerequisites.len) {
              $panic();
            }
            _M0MPC15array5Array4pushGiE(prerequisites.buf[to], from);
            _tmp$2 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp = from + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const next_index = new _M0TPB8MutLocalGiE(0);
    const indices = $make_array_len_and_init(n, -1);
    const low = $make_array_len_and_init(n, 0);
    const on_stack = $make_array_len_and_init(n, false);
    const stack = new _M0TPB5ArrayGiE([], 0);
    const components = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    const component = $make_array_len_and_init(n, 0);
    const _env = { _0: stack, _1: next_index, _2: indices, _3: low, _4: on_stack, _5: component, _6: dependents, _7: components };
    let _tmp$2 = 0;
    while (true) {
      const i = _tmp$2;
      if (i < n) {
        if ((i >>> 0 < indices.length ? indices[i] : $oob()) < 0) {
          _M0FP310monkeyfist2mf4core18graph__interactionN5visitS4222(_env, i);
        }
        _tmp$2 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const k = components.len;
    let arcs;
    if (k <= 0) {
      arcs = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(k);
      let _tmp$3 = 0;
      while (true) {
        const _p$2 = _tmp$3;
        if (_p$2 < k) {
          const _p$3 = new _M0TPB5ArrayGiE([], 0);
          _p.buf[_p$2] = _p$3;
          _tmp$3 = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      arcs = _p;
    }
    const indegree = $make_array_len_and_init(k, 0);
    let _tmp$3 = 0;
    while (true) {
      const i = _tmp$3;
      if (i < n) {
        if (i < 0 || i >= dependents.len) {
          $panic();
        }
        const _bind = dependents.buf[i];
        const _bind$2 = _bind.len;
        const _bind$3 = _bind.buf;
        let _tmp$4 = 0;
        while (true) {
          const _ = _tmp$4;
          if (_ < _bind$2) {
            const j = _bind$3[_];
            const a = i >>> 0 < component.length ? component[i] : $oob();
            const c = j >>> 0 < component.length ? component[j] : $oob();
            let _tmp$5;
            if (a !== c) {
              if (a < 0 || a >= arcs.len) {
                $panic();
              }
              _tmp$5 = !_M0FP310monkeyfist2mf4core8contains(arcs.buf[a], c);
            } else {
              _tmp$5 = false;
            }
            if (_tmp$5) {
              if (a < 0 || a >= arcs.len) {
                $panic();
              }
              _M0MPC15array5Array4pushGiE(arcs.buf[a], c);
              if (c >>> 0 < indegree.length) {
                indegree[c] = (c >>> 0 < indegree.length ? indegree[c] : $oob()) + 1 | 0;
              } else {
                $oob();
              }
            }
            _tmp$4 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp$3 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const queue = new _M0TPB5ArrayGiE([], 0);
    let _tmp$4 = 0;
    while (true) {
      const i = _tmp$4;
      if (i < k) {
        if ((i >>> 0 < indegree.length ? indegree[i] : $oob()) === 0) {
          _M0MPC15array5Array4pushGiE(queue, i);
        }
        _tmp$4 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let q = 0;
    while (true) {
      if (q < queue.len) {
        const _bind = q;
        if (_bind < 0 || _bind >= queue.len) {
          $panic();
        }
        const _bind$2 = queue.buf[_bind];
        if (_bind$2 < 0 || _bind$2 >= arcs.len) {
          $panic();
        }
        const _bind$3 = arcs.buf[_bind$2];
        const _bind$4 = _bind$3.len;
        const _bind$5 = _bind$3.buf;
        let _tmp$5 = 0;
        while (true) {
          const _ = _tmp$5;
          if (_ < _bind$4) {
            const c = _bind$5[_];
            if (c >>> 0 < indegree.length) {
              indegree[c] = (c >>> 0 < indegree.length ? indegree[c] : $oob()) - 1 | 0;
            } else {
              $oob();
            }
            if ((c >>> 0 < indegree.length ? indegree[c] : $oob()) === 0) {
              _M0MPC15array5Array4pushGiE(queue, c);
            }
            _tmp$5 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        q = q + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let reach;
    if (k <= 0) {
      reach = new _M0TPB5ArrayGAbE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(k);
      let _tmp$5 = 0;
      while (true) {
        const _p$2 = _tmp$5;
        if (_p$2 < k) {
          const _p$3 = $make_array_len_and_init(k, false);
          _p.buf[_p$2] = _p$3;
          _tmp$5 = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      reach = _p;
    }
    let _tmp$5 = queue.len - 1 | 0;
    while (true) {
      const qi = _tmp$5;
      if (qi >= 0) {
        if (qi < 0 || qi >= queue.len) {
          $panic();
        }
        const a = queue.buf[qi];
        if (a < 0 || a >= arcs.len) {
          $panic();
        }
        const _bind = arcs.buf[a];
        const _bind$2 = _bind.len;
        const _bind$3 = _bind.buf;
        let _tmp$6 = 0;
        while (true) {
          const _ = _tmp$6;
          if (_ < _bind$2) {
            const c = _bind$3[_];
            if (a < 0 || a >= reach.len) {
              $panic();
            }
            const _tmp$7 = reach.buf[a];
            if (c >>> 0 < _tmp$7.length) {
              _tmp$7[c] = true;
            } else {
              $oob();
            }
            let _tmp$8 = 0;
            while (true) {
              const x = _tmp$8;
              if (x < k) {
                if (c < 0 || c >= reach.len) {
                  $panic();
                }
                const _tmp$9 = reach.buf[c];
                if (x >>> 0 < _tmp$9.length ? _tmp$9[x] : $oob()) {
                  if (a < 0 || a >= reach.len) {
                    $panic();
                  }
                  const _tmp$10 = reach.buf[a];
                  if (x >>> 0 < _tmp$10.length) {
                    _tmp$10[x] = true;
                  } else {
                    $oob();
                  }
                }
                _tmp$8 = x + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            _tmp$6 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp$5 = qi - 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let essential;
    if (k <= 0) {
      essential = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(k);
      let _tmp$6 = 0;
      while (true) {
        const _p$2 = _tmp$6;
        if (_p$2 < k) {
          if (_p$2 < 0 || _p$2 >= arcs.len) {
            $panic();
          }
          const _p$3 = arcs.buf[_p$2];
          const _p$4 = new _M0TPB5ArrayGiE([], 0);
          const _p$5 = _p$3.len;
          const _p$6 = _p$3.buf;
          let _p$7;
          let _tmp$7 = 0;
          while (true) {
            const _p$8 = _tmp$7;
            if (_p$8 < _p$5) {
              const _p$9 = _p$6[_p$8];
              if (_p$2 < 0 || _p$2 >= arcs.len) {
                $panic();
              }
              const _p$10 = _M0MPC15array5Array4iterGiE(arcs.buf[_p$2]);
              let _tmp$8;
              while (true) {
                const _p$11 = _M0MPB4Iter4nextGiE(_p$10);
                if (_p$11 === undefined) {
                  _tmp$8 = false;
                  break;
                } else {
                  const _p$12 = _p$11;
                  const _p$13 = _p$12;
                  let _tmp$9;
                  if (_p$13 !== _p$9) {
                    if (_p$13 < 0 || _p$13 >= reach.len) {
                      $panic();
                    }
                    const _tmp$10 = reach.buf[_p$13];
                    _tmp$9 = _p$9 >>> 0 < _tmp$10.length ? _tmp$10[_p$9] : $oob();
                  } else {
                    _tmp$9 = false;
                  }
                  if (_tmp$9) {
                    _tmp$8 = true;
                    break;
                  }
                  continue;
                }
              }
              if (!_tmp$8) {
                _M0MPC15array5Array4pushGiE(_p$4, _p$9);
              }
              _tmp$7 = _p$8 + 1 | 0;
              continue;
            } else {
              _p$7 = _p$4;
              break;
            }
          }
          _p.buf[_p$2] = _p$7;
          _tmp$6 = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      essential = _p;
    }
    const incoming = $make_array_len_and_init(k, 0);
    const _bind = essential.len;
    const _bind$2 = essential.buf;
    let _tmp$6 = 0;
    while (true) {
      const _ = _tmp$6;
      if (_ < _bind) {
        const next = _bind$2[_];
        const _bind$3 = next.len;
        const _bind$4 = next.buf;
        let _tmp$7 = 0;
        while (true) {
          const _$2 = _tmp$7;
          if (_$2 < _bind$3) {
            const c = _bind$4[_$2];
            if (c >>> 0 < incoming.length) {
              incoming[c] = (c >>> 0 < incoming.length ? incoming[c] : $oob()) + 1 | 0;
            } else {
              $oob();
            }
            _tmp$7 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp$6 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _p = _M0MPC15array5Array20unsafe__make__uninitGiE(components.len);
    const _p$2 = components.len;
    const _p$3 = components.buf;
    let _tmp$7 = 0;
    while (true) {
      const _p$4 = _tmp$7;
      if (_p$4 < _p$2) {
        const _p$5 = _p$3[_p$4];
        const _p$6 = new _M0TPB5ArrayGiE([], 0);
        const _p$7 = _p$5.len;
        const _p$8 = _p$5.buf;
        let _tmp$8;
        let _tmp$9 = 0;
        while (true) {
          const _p$9 = _tmp$9;
          if (_p$9 < _p$7) {
            const _p$10 = _p$8[_p$9];
            if (_p$10 < 0 || _p$10 >= prerequisites.len) {
              $panic();
            }
            const _p$11 = prerequisites.buf[_p$10];
            const _p$12 = new _M0TPB5ArrayGiE([], 0);
            const _p$13 = _p$11.len;
            const _p$14 = _p$11.buf;
            let _tmp$10;
            let _tmp$11 = 0;
            while (true) {
              const _p$15 = _tmp$11;
              if (_p$15 < _p$13) {
                const _p$16 = _p$14[_p$15];
                if ((_p$16 >>> 0 < component.length ? component[_p$16] : $oob()) === (_p$10 >>> 0 < component.length ? component[_p$10] : $oob())) {
                  _M0MPC15array5Array4pushGiE(_p$12, _p$16);
                }
                _tmp$11 = _p$15 + 1 | 0;
                continue;
              } else {
                _tmp$10 = _p$12;
                break;
              }
            }
            if (_tmp$10.len >= 2) {
              _M0MPC15array5Array4pushGiE(_p$6, _p$10);
            }
            _tmp$9 = _p$9 + 1 | 0;
            continue;
          } else {
            _tmp$8 = _p$6;
            break;
          }
        }
        const _p$9 = _tmp$8.len;
        _p.buf[_p$4] = _p$9;
        _tmp$7 = _p$4 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const internal_joins = _p;
    let joins = 0;
    const _bind$3 = incoming.length;
    let _tmp$8 = 0;
    while (true) {
      const _ = _tmp$8;
      if (_ < _bind$3) {
        const x = incoming[_];
        if (x >= 2) {
          joins = joins + 1 | 0;
        }
        _tmp$8 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$4 = internal_joins.len;
    const _bind$5 = internal_joins.buf;
    let _tmp$9 = 0;
    while (true) {
      const _ = _tmp$9;
      if (_ < _bind$4) {
        const x = _bind$5[_];
        joins = joins + x | 0;
        _tmp$9 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let junctions;
    if (k <= 0) {
      junctions = new _M0TPB5ArrayGiE([], 0);
    } else {
      const _p$4 = _M0MPC15array5Array20unsafe__make__uninitGiE(k);
      let _tmp$10 = 0;
      while (true) {
        const _p$5 = _tmp$10;
        if (_p$5 < k) {
          const _tmp$11 = (_p$5 >>> 0 < incoming.length ? incoming[_p$5] : $oob()) >= 2 ? 1 : 0;
          let _tmp$12;
          if (_p$5 < 0 || _p$5 >= internal_joins.len) {
            $panic();
          }
          if (internal_joins.buf[_p$5] > 0) {
            _tmp$12 = 1;
          } else {
            _tmp$12 = 0;
          }
          const _p$6 = _tmp$11 + _tmp$12 | 0;
          _p$4.buf[_p$5] = _p$6;
          _tmp$10 = _p$5 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      junctions = _p$4;
    }
    const branch = _M0MPC15array10FixedArray5makeiGiE(k, (i) => {
      if (i < 0 || i >= junctions.len) {
        $panic();
      }
      return junctions.buf[i];
    });
    const _bind$6 = queue.len;
    const _bind$7 = queue.buf;
    let _tmp$10 = 0;
    while (true) {
      const _ = _tmp$10;
      if (_ < _bind$6) {
        const a = _bind$7[_];
        if (a < 0 || a >= essential.len) {
          $panic();
        }
        const _bind$8 = essential.buf[a];
        const _bind$9 = _bind$8.len;
        const _bind$10 = _bind$8.buf;
        let _tmp$11 = 0;
        while (true) {
          const _$2 = _tmp$11;
          if (_$2 < _bind$9) {
            const c = _bind$10[_$2];
            const _p$4 = c >>> 0 < branch.length ? branch[c] : $oob();
            const _tmp$12 = a >>> 0 < branch.length ? branch[a] : $oob();
            if (c < 0 || c >= junctions.len) {
              $panic();
            }
            const _p$5 = _tmp$12 + junctions.buf[c] | 0;
            if (c >>> 0 < branch.length) {
              branch[c] = _p$4 > _p$5 ? _p$4 : _p$5;
            } else {
              $oob();
            }
            _tmp$11 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp$10 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let mutual = 0;
    const _bind$8 = components.len;
    const _bind$9 = components.buf;
    let _tmp$11 = 0;
    while (true) {
      const _ = _tmp$11;
      if (_ < _bind$8) {
        const group = _bind$9[_];
        if (group.len > 1) {
          mutual = mutual + group.len | 0;
        }
        _tmp$11 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let branching = 0;
    const _bind$10 = branch.length;
    let _tmp$12 = 0;
    while (true) {
      const _ = _tmp$12;
      if (_ < _bind$10) {
        const x = branch[_];
        const _p$4 = branching;
        branching = _p$4 > x ? _p$4 : x;
        _tmp$12 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const seen = $make_array_len_and_init(n, false);
    let largest = 0;
    let _tmp$13 = 0;
    while (true) {
      const i = _tmp$13;
      if (i < n) {
        _L: {
          if (i >>> 0 < seen.length ? seen[i] : $oob()) {
            break _L;
          }
          const group = new _M0TPB5ArrayGiE([i], 1);
          if (i >>> 0 < seen.length) {
            seen[i] = true;
          } else {
            $oob();
          }
          let gq = 0;
          while (true) {
            if (gq < group.len) {
              const _bind$11 = gq;
              if (_bind$11 < 0 || _bind$11 >= group.len) {
                $panic();
              }
              const v = group.buf[_bind$11];
              if (v < 0 || v >= prerequisites.len) {
                $panic();
              }
              const _bind$12 = prerequisites.buf[v];
              const _bind$13 = _bind$12.len;
              const _bind$14 = _bind$12.buf;
              let _tmp$14 = 0;
              while (true) {
                const _ = _tmp$14;
                if (_ < _bind$13) {
                  const x = _bind$14[_];
                  if (!(x >>> 0 < seen.length ? seen[x] : $oob())) {
                    if (x >>> 0 < seen.length) {
                      seen[x] = true;
                    } else {
                      $oob();
                    }
                    _M0MPC15array5Array4pushGiE(group, x);
                  }
                  _tmp$14 = _ + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              if (v < 0 || v >= dependents.len) {
                $panic();
              }
              const _bind$15 = dependents.buf[v];
              const _bind$16 = _bind$15.len;
              const _bind$17 = _bind$15.buf;
              let _tmp$15 = 0;
              while (true) {
                const _ = _tmp$15;
                if (_ < _bind$16) {
                  const x = _bind$17[_];
                  if (!(x >>> 0 < seen.length ? seen[x] : $oob())) {
                    if (x >>> 0 < seen.length) {
                      seen[x] = true;
                    } else {
                      $oob();
                    }
                    _M0MPC15array5Array4pushGiE(group, x);
                  }
                  _tmp$15 = _ + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              gq = gq + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if (group.len > 1) {
            const _p$4 = largest;
            const _p$5 = group.len;
            largest = _p$4 > _p$5 ? _p$4 : _p$5;
          }
          break _L;
        }
        _tmp$13 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const nd = n + 0;
    const connected = (largest + 0) / (1 > nd ? 1 : nd);
    const _tmp$14 = joins + 0;
    const _p$4 = nd * 0.25;
    const _p$5 = _tmp$14 / (1 > _p$4 ? 1 : _p$4);
    const _tmp$15 = 3 * (_p$5 < 1 ? _p$5 : 1) + 2.5 * (mutual + 0) / (1 > nd ? 1 : nd) + 2 * (revisited + 0) / (1 > nd ? 1 : nd);
    const _p$6 = (branching + 0) / 4;
    const evidence = _tmp$15 + 1.5 * (_p$6 < 1 ? _p$6 : 1);
    return _M0FP310monkeyfist2mf4core9to__fixed(evidence * (0.4 + 0.6 * connected), 4);
  }
  function _M0FP310monkeyfist2mf4core7replace(paths, i, p) {
    const next = _M0MPC15array5Array4copyGORPB5ArrayGRP310monkeyfist2mf4core2PtEE(paths);
    if (i < 0 || i >= next.len) {
      $panic();
    }
    next.buf[i] = p;
    return next;
  }
  function _M0FP310monkeyfist2mf4core4tail(route, n) {
    return _M0MPC15array9ArrayView9to__ownedGRP310monkeyfist2mf4core2PtE(_M0MPC15array5Array21clamped__view_2einnerGRP310monkeyfist2mf4core2PtE(route, route.len - n | 0, undefined));
  }
  function _M0MP310monkeyfist2mf4core3Geo3tap(self, paths, i) {
    if (i < 0 || i >= paths.len) {
      $panic();
    }
    const _bind = paths.buf[i];
    if (_bind === undefined) {
      return undefined;
    } else {
      const _Some = _bind;
      const _path = _Some;
      const s = _M0MP310monkeyfist2mf4core3Geo4mark(self, paths);
      const route = _M0MPC15array5Array4copyGRP310monkeyfist2mf4core2PtE(_path);
      const _bind$2 = _M0MP310monkeyfist2mf4core3Geo9direction(self, _path);
      const _dq0 = _bind$2._0;
      const _dr0 = _bind$2._1;
      let p = _M0FP310monkeyfist2mf4core4last(_path);
      let dq = _dq0;
      let dr = _dr0;
      let distance = 0;
      if (self.hex) {
        const seen = new _M0TPB5ArrayGiE([], 0);
        let d = _M0FP310monkeyfist2mf4core15hex__dir__index(dq, dr);
        while (true) {
          const _tmp = p.q;
          const _tmp$2 = d;
          const _tmp$3 = _tmp + (_tmp$2 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[_tmp$2] : $oob()) | 0;
          const _tmp$4 = p.r;
          const _tmp$5 = d;
          const next = new _M0TP310monkeyfist2mf4core2Pt(_tmp$3, _tmp$4 + (_tmp$5 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[_tmp$5] : $oob()) | 0);
          if (!_M0MP310monkeyfist2mf4core3Geo6inside(self, next)) {
            const _bind$3 = _path.len + 2 | 0;
            let _tmp$6 = 0;
            while (true) {
              const _ = _tmp$6;
              if (_ < _bind$3) {
                const _tmp$7 = p.q;
                const _tmp$8 = d;
                const _tmp$9 = _tmp$7 + (_tmp$8 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[_tmp$8] : $oob()) | 0;
                const _tmp$10 = p.r;
                const _tmp$11 = d;
                p = new _M0TP310monkeyfist2mf4core2Pt(_tmp$9, _tmp$10 + (_tmp$11 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[_tmp$11] : $oob()) | 0);
                _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(route, p);
                distance = distance + 1 | 0;
                _tmp$6 = _ + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            return new _M0TP310monkeyfist2mf4core4Move(_M0FP310monkeyfist2mf4core7replace(paths, i, undefined), 0, distance, route);
          }
          const c = _M0MP310monkeyfist2mf4core3Geo4cell(self, next);
          const _tmp$6 = self.occ;
          if ((c >>> 0 < _tmp$6.length ? _tmp$6[c] : $oob()) === s) {
            break;
          }
          const _tmp$7 = self.spring;
          if (c >>> 0 < _tmp$7.length ? _tmp$7[c] : $oob()) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(route, next);
            distance = distance + 1 | 0;
            const back = _M0FP310monkeyfist2mf4core4tail(route, _path.len);
            _M0MPC15array5Array14rev__in__placeGRP310monkeyfist2mf4core2PtE(back);
            return new _M0TP310monkeyfist2mf4core4Move(_M0FP310monkeyfist2mf4core7replace(paths, i, back), 1, distance, route);
          }
          if (_M0FP310monkeyfist2mf4core8contains(seen, c)) {
            return undefined;
          }
          _M0MPC15array5Array4pushGiE(seen, c);
          p = next;
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(route, p);
          distance = distance + 1 | 0;
          const _tmp$8 = self.mirror;
          const axis = c >>> 0 < _tmp$8.length ? _tmp$8[c] : $oob();
          if (axis >= 0) {
            const _p = d;
            d = ((((Math.imul(2, axis) | 0) - _p | 0) % 6 | 0) + 6 | 0) % 6 | 0;
          }
          continue;
        }
        if (distance === 0) {
          return undefined;
        }
        return new _M0TP310monkeyfist2mf4core4Move(_M0FP310monkeyfist2mf4core7replace(paths, i, _M0FP310monkeyfist2mf4core4tail(route, _path.len)), 2, distance, route);
      }
      const seen = new _M0TPB5ArrayGiE([], 0);
      let event = 2;
      while (true) {
        const state = ((Math.imul(((Math.imul((Math.imul(p.r, self.w) | 0) + p.q | 0, 3) | 0) + dq | 0) + 1 | 0, 3) | 0) + dr | 0) + 1 | 0;
        if (_M0FP310monkeyfist2mf4core8contains(seen, state)) {
          return undefined;
        }
        _M0MPC15array5Array4pushGiE(seen, state);
        const nq = p.q + dq | 0;
        const nr = p.r + dr | 0;
        if (nq < 0 || (nr < 0 || (nq >= self.w || nr >= self.h))) {
          event = 0;
          const _bind$3 = _path.len + 2 | 0;
          let _tmp = 0;
          while (true) {
            const _ = _tmp;
            if (_ < _bind$3) {
              p = new _M0TP310monkeyfist2mf4core2Pt(p.q + dq | 0, p.r + dr | 0);
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(route, p);
              distance = distance + 1 | 0;
              _tmp = _ + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          break;
        }
        const c = (Math.imul(nr, self.w) | 0) + nq | 0;
        const _tmp = self.occ;
        if ((c >>> 0 < _tmp.length ? _tmp[c] : $oob()) === s) {
          break;
        }
        p = new _M0TP310monkeyfist2mf4core2Pt(nq, nr);
        _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(route, p);
        distance = distance + 1 | 0;
        const _tmp$2 = self.spring;
        if (c >>> 0 < _tmp$2.length ? _tmp$2[c] : $oob()) {
          event = 1;
          break;
        }
        const _tmp$3 = self.mirror;
        const m = c >>> 0 < _tmp$3.length ? _tmp$3[c] : $oob();
        if (m >= 0) {
          const _bind$3 = _M0FP310monkeyfist2mf4core4turn(m, dq, dr);
          const _a = _bind$3._0;
          const _b = _bind$3._1;
          dq = _a;
          dr = _b;
        }
        continue;
      }
      if (event === 2 && distance === 0) {
        return undefined;
      }
      let rest;
      if (event === 0) {
        rest = undefined;
      } else {
        const t = _M0FP310monkeyfist2mf4core4tail(route, _path.len);
        if (event === 1) {
          _M0MPC15array5Array14rev__in__placeGRP310monkeyfist2mf4core2PtE(t);
        }
        rest = t;
      }
      return new _M0TP310monkeyfist2mf4core4Move(_M0FP310monkeyfist2mf4core7replace(paths, i, rest), event, distance, route);
    }
  }
  function _M0FP310monkeyfist2mf4core11interaction(b, g, plan, manual) {
    const n = b.ropes.len;
    let dependents;
    if (n <= 0) {
      dependents = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(n);
      let _tmp = 0;
      while (true) {
        const _p$2 = _tmp;
        if (_p$2 < n) {
          const _p$3 = new _M0TPB5ArrayGiE([], 0);
          _p.buf[_p$2] = _p$3;
          _tmp = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      dependents = _p;
    }
    let paths = _M0FP310monkeyfist2mf4core11some__paths(b.ropes);
    let before = _M0FP310monkeyfist2mf4core8snapshot(g, paths);
    const actions = $make_array_len_and_init(n, 0);
    const last_action = $make_array_len_and_init(n, -1);
    const last_freed = $make_array_len_and_init(n, -1);
    const revisited = $make_array_len_and_init(n, false);
    let revisited_count = 0;
    const _p = plan.len;
    const _p$2 = 0 > manual ? 0 : manual;
    const steps = _p < _p$2 ? _p : _p$2;
    let _tmp = 0;
    while (true) {
      const step = _tmp;
      if (step < steps) {
        if (step < 0 || step >= plan.len) {
          $panic();
        }
        const id = plan.buf[step];
        const _bind = _M0MP310monkeyfist2mf4core3Geo3tap(g, paths, id);
        if (_bind === undefined) {
          break;
        } else {
          const _Some = _bind;
          const _mv = _Some;
          const after = _M0FP310monkeyfist2mf4core8snapshot(g, _mv.paths);
          let _tmp$2 = 0;
          while (true) {
            const j = _tmp$2;
            if (j < n) {
              _L: {
                if (j === id) {
                  break _L;
                }
                const _bind$2 = before;
                if (j < 0 || j >= _bind$2.len) {
                  $panic();
                }
                const _bind$3 = _bind$2.buf[j];
                if (_bind$3 === undefined) {
                  break _L;
                } else {
                  const _Some$2 = _bind$3;
                  const _a = _Some$2;
                  if (j < 0 || j >= after.len) {
                    $panic();
                  }
                  const _bind$4 = after.buf[j];
                  if (_bind$4 === undefined) {
                    break _L;
                  } else {
                    const _Some$3 = _bind$4;
                    const _bb = _Some$3;
                    if (_a.blocker !== id || _bb.event === 2) {
                      break _L;
                    }
                    if (_bb.distance > _a.distance || _bb.event === 0 && _a.event !== 0) {
                      if (id < 0 || id >= dependents.len) {
                        $panic();
                      }
                      if (!_M0FP310monkeyfist2mf4core8contains(dependents.buf[id], j)) {
                        if (id < 0 || id >= dependents.len) {
                          $panic();
                        }
                        _M0MPC15array5Array4pushGiE(dependents.buf[id], j);
                      }
                      if (j >>> 0 < last_freed.length) {
                        last_freed[j] = step;
                      } else {
                        $oob();
                      }
                    }
                  }
                }
                break _L;
              }
              _tmp$2 = j + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if ((id >>> 0 < actions.length ? actions[id] : $oob()) > 0 && ((id >>> 0 < last_freed.length ? last_freed[id] : $oob()) > (id >>> 0 < last_action.length ? last_action[id] : $oob()) && !(id >>> 0 < revisited.length ? revisited[id] : $oob()))) {
            if (id >>> 0 < revisited.length) {
              revisited[id] = true;
            } else {
              $oob();
            }
            revisited_count = revisited_count + 1 | 0;
          }
          if (id >>> 0 < actions.length) {
            actions[id] = (id >>> 0 < actions.length ? actions[id] : $oob()) + 1 | 0;
          } else {
            $oob();
          }
          if (id >>> 0 < last_action.length) {
            last_action[id] = step;
          } else {
            $oob();
          }
          paths = _mv.paths;
          before = after;
        }
        _tmp = step + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return _M0FP310monkeyfist2mf4core18graph__interaction(dependents, n, revisited_count);
  }
  function _M0MP310monkeyfist2mf4core3Geo3new(b) {
    const mirror = $make_array_len_and_init(Math.imul(b.w, b.h) | 0, -1);
    const spring = $make_array_len_and_init(Math.imul(b.w, b.h) | 0, false);
    const g = new _M0TP310monkeyfist2mf4core3Geo(b.hex, b.w, b.h, mirror, spring, b.mirrors.len, b.springs.len, $make_array_len_and_init(Math.imul(b.w, b.h) | 0, 0), 0, -1, b.hex ? _M0MP310monkeyfist2mf4core9SqMirrors5empty() : _M0MP310monkeyfist2mf4core9SqMirrors9of__board(b));
    const _bind = b.mirrors;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const m = _bind$3[_];
        const _tmp$2 = _M0MP310monkeyfist2mf4core3Geo4cell(g, m.cell);
        if (_tmp$2 >>> 0 < mirror.length) {
          mirror[_tmp$2] = m.kind;
        } else {
          $oob();
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$4 = b.springs;
    const _bind$5 = _bind$4.len;
    const _bind$6 = _bind$4.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$5) {
        const p = _bind$6[_];
        const _tmp$3 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
        if (_tmp$3 >>> 0 < spring.length) {
          spring[_tmp$3] = true;
        } else {
          $oob();
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return g;
  }
  function _M0MP310monkeyfist2mf4core3Geo15all__free__full(self, paths) {
    const _bind = paths.len;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        if (i < 0 || i >= paths.len) {
          $panic();
        }
        const _bind$2 = paths.buf[i];
        if (_bind$2 === undefined) {
        } else {
          _L: {
            _L$2: {
              const _bind$3 = _M0MP310monkeyfist2mf4core3Geo3tap(self, paths, i);
              if (_bind$3 === undefined) {
                break _L$2;
              } else {
                const _Some = _bind$3;
                const _m = _Some;
                if (_m.event === 0) {
                } else {
                  break _L$2;
                }
              }
              break _L;
            }
            return false;
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return true;
  }
  function _M0MP310monkeyfist2mf4core3Geo3key(self, paths) {
    const sb = _M0MPB13StringBuilder21StringBuilder_2einner(8);
    const _bind = paths.len;
    const _bind$2 = paths.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const p = _bind$2[_];
        if (p === undefined) {
          _M0IPB13StringBuilderPB6Logger11write__char(sb, 1);
        } else {
          const _Some = p;
          const _path = _Some;
          _M0IPB13StringBuilderPB6Logger11write__char(sb, _path.len + 2 | 0);
          const _bind$3 = _path.len;
          const _bind$4 = _path.buf;
          let _tmp$2 = 0;
          while (true) {
            const _$2 = _tmp$2;
            if (_$2 < _bind$3) {
              const c = _bind$4[_$2];
              _M0IPB13StringBuilderPB6Logger11write__char(sb, _M0MP310monkeyfist2mf4core3Geo4cell(self, c) + 1 | 0);
              _tmp$2 = _$2 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return sb.val;
  }
  function _M0MP310monkeyfist2mf4core3Geo11solve__fullN6searchS4505(_env, current, preferred) {
    const visited = _env._5;
    const budget = _env._4;
    const moves = _env._3;
    const nodes = _env._2;
    const self = _env._1;
    const unknown = _env._0;
    if (_M0FP310monkeyfist2mf4core9all__gone(current)) {
      return true;
    }
    const state = _M0MP310monkeyfist2mf4core3Geo3key(self, current);
    if (_M0MPB3Map8containsGsbE(visited, state)) {
      return false;
    }
    nodes.val = nodes.val + 1 | 0;
    if (nodes.val > budget) {
      unknown.val = true;
      return false;
    }
    _M0MPB3Map3setGsbE(visited, state, true);
    let p0;
    if ((preferred.end - preferred.start | 0) > 0) {
      if (0 >= (preferred.end - preferred.start | 0)) {
        $panic();
      }
      p0 = preferred.buf[preferred.start];
    } else {
      p0 = -1;
    }
    const tries = new _M0TPB5ArrayGUiRP310monkeyfist2mf4core4MoveEE([], 0);
    const _bind = current.len;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        if (i < 0 || i >= current.len) {
          $panic();
        }
        const _bind$2 = current.buf[i];
        if (_bind$2 === undefined) {
        } else {
          const _bind$3 = _M0MP310monkeyfist2mf4core3Geo3tap(self, current, i);
          if (_bind$3 === undefined) {
          } else {
            const _Some = _bind$3;
            const _m = _Some;
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(tries, { _0: i, _1: _m });
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0FP310monkeyfist2mf4core5ssortGUiiEE(tries, (a, b) => a._0 === p0 ? -1 : b._0 === p0 ? 1 : (a._1.event === 0 ? 0 : 1) - (b._1.event === 0 ? 0 : 1) | 0);
    const _bind$2 = tries.len;
    const _bind$3 = tries.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$2) {
        const t = _bind$3[_];
        _M0MPC15array5Array4pushGiE(moves, t._0);
        if (_M0MP310monkeyfist2mf4core3Geo11solve__fullN6searchS4505(_env, t._1.paths, t._0 === p0 ? _M0MPC15array9ArrayView21clamped__view_2einnerGiE(preferred, 1, undefined) : preferred)) {
          return true;
        }
        _M0MPC15array5Array3popGiE(moves);
        if (unknown.val) {
          return false;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0MP310monkeyfist2mf4core3Geo11solve__fullN6searchS4506(_env, current) {
    const visited = _env._9;
    const lastk = _env._8;
    const budget = _env._7;
    const n = _env._6;
    const moves = _env._5;
    const nodes = _env._4;
    const first = _env._3;
    const self = _env._2;
    const unknown = _env._1;
    const moved = _env._0;
    if (_M0FP310monkeyfist2mf4core9all__gone(current)) {
      return true;
    }
    const key = _M0MP310monkeyfist2mf4core3Geo3key(self, current);
    if (_M0MPB3Map8containsGsbE(visited, key)) {
      return false;
    }
    nodes.val = nodes.val + 1 | 0;
    if (nodes.val > budget) {
      unknown.val = true;
      return false;
    }
    _M0MPB3Map3setGsbE(visited, key, true);
    const tries = new _M0TPB5ArrayGUiRP310monkeyfist2mf4core4MoveiEE([], 0);
    const _bind = current.len;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        _L: {
          const _bind$2 = _M0MP310monkeyfist2mf4core3Geo3tap(self, current, i);
          if (_bind$2 === undefined) {
            break _L;
          } else {
            const _Some = _bind$2;
            const _next = _Some;
            const _bind$3 = _M0MPB3Map3getGiiE((i >>> 0 < moved.length ? moved[i] : $oob()) > 0 ? lastk : first, i);
            let rank;
            if (_bind$3 === undefined) {
              rank = Math.imul(n, 4) | 0;
            } else {
              const _Some$2 = _bind$3;
              rank = _Some$2;
            }
            const ev = _next.event === 0 ? 0 : _next.event === 1 ? 1 : 2;
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(tries, { _0: i, _1: _next, _2: (Math.imul(rank, 3) | 0) + ev | 0 });
          }
          break _L;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0FP310monkeyfist2mf4core5ssortGUiiEE(tries, (a, b) => a._2 !== b._2 ? a._2 - b._2 | 0 : a._0 - b._0 | 0);
    const _bind$2 = tries.len;
    const _bind$3 = tries.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$2) {
        const t = _bind$3[_];
        _M0MPC15array5Array4pushGiE(moves, t._0);
        const _index_12 = t._0;
        if (_index_12 >>> 0 < moved.length) {
          moved[_index_12] = (_index_12 >>> 0 < moved.length ? moved[_index_12] : $oob()) + 1 | 0;
        } else {
          $oob();
        }
        if (_M0MP310monkeyfist2mf4core3Geo11solve__fullN6searchS4506(_env, t._1.paths)) {
          return true;
        }
        const _index_14 = t._0;
        if (_index_14 >>> 0 < moved.length) {
          moved[_index_14] = (_index_14 >>> 0 < moved.length ? moved[_index_14] : $oob()) - 1 | 0;
        } else {
          $oob();
        }
        _M0MPC15array5Array3popGiE(moves);
        if (unknown.val) {
          return false;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0MP310monkeyfist2mf4core3Geo11solve__full(self, paths, budget, prefer) {
    const _bind = [];
    const visited = _M0MPB3Map3MapGsbE(new _M0TPB9ArrayViewGUsbEE(_bind, 0, 0), undefined);
    const moves = new _M0TPB5ArrayGiE([], 0);
    const nodes = new _M0TPB8MutLocalGiE(0);
    const unknown = new _M0TPB8MutLocalGbE(false);
    if (self.hex) {
      const _env = { _0: unknown, _1: self, _2: nodes, _3: moves, _4: budget, _5: visited };
      const solved = _M0MP310monkeyfist2mf4core3Geo11solve__fullN6searchS4505(_env, paths, new _M0TPB9ArrayViewGiE(prefer.buf, 0, prefer.len));
      return new _M0TP310monkeyfist2mf4core6Solved(solved ? _M0MP310monkeyfist2mf4core3Geo11solve__fullN6constrS4507 : unknown.val ? -1 : _M0MP310monkeyfist2mf4core3Geo11solve__fullN6constrS4508, solved ? moves : new _M0TPB5ArrayGiE([], 0), nodes.val);
    }
    const n = paths.len;
    const _bind$2 = [];
    const first = _M0MPB3Map3MapGiiE(new _M0TPB9ArrayViewGUiiEE(_bind$2, 0, 0), undefined);
    const _bind$3 = [];
    const lastk = _M0MPB3Map3MapGiiE(new _M0TPB9ArrayViewGUiiEE(_bind$3, 0, 0), undefined);
    const moved = $make_array_len_and_init(n, 0);
    const _bind$4 = prefer.len;
    const _bind$5 = prefer.buf;
    let _tmp = 0;
    while (true) {
      const k = _tmp;
      if (k < _bind$4) {
        const i = _bind$5[k];
        if (!_M0MPB3Map8containsGiiE(first, i)) {
          _M0MPB3Map3setGiiE(first, i, k);
        }
        _M0MPB3Map3setGiiE(lastk, i, k);
        _tmp = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _env = { _0: moved, _1: unknown, _2: self, _3: first, _4: nodes, _5: moves, _6: n, _7: budget, _8: lastk, _9: visited };
    const solved = _M0MP310monkeyfist2mf4core3Geo11solve__fullN6searchS4506(_env, paths);
    return new _M0TP310monkeyfist2mf4core6Solved(solved ? _M0MP310monkeyfist2mf4core3Geo11solve__fullN6constrS4509 : unknown.val ? -1 : _M0MP310monkeyfist2mf4core3Geo11solve__fullN6constrS4510, solved ? moves : new _M0TPB5ArrayGiE([], 0), nodes.val);
  }
  function _M0MP310monkeyfist2mf4core5Board3geo(self) {
    return _M0MP310monkeyfist2mf4core3Geo3new(self);
  }
  function _M0FP310monkeyfist2mf4core11exit__index(w, path, m) {
    const _bind = _M0FP310monkeyfist2mf4core9head__dir(path);
    const _dq = _bind._0;
    const _dr = _bind._1;
    const d = _M0FP310monkeyfist2mf4core15hex__dir__index(_dq, _dr);
    const axis = _M0MP310monkeyfist2mf4core9SqMirrors3get(m, _M0FP310monkeyfist2mf4core9hex__cell(_M0FP310monkeyfist2mf4core4last(path), w));
    return axis < 0 ? d : ((((Math.imul(2, axis) | 0) - d | 0) % 6 | 0) + 6 | 0) % 6 | 0;
  }
  function _M0FP310monkeyfist2mf4core12hex__mirrors(w, h, mirrors) {
    const m = new _M0TP310monkeyfist2mf4core9SqMirrors($make_array_len_and_init(Math.imul(w, h) | 0, -1), new _M0TPB5ArrayGiE([], 0));
    const _bind = mirrors.len;
    const _bind$2 = mirrors.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const x = _bind$2[_];
        _M0MP310monkeyfist2mf4core9SqMirrors3set(m, _M0FP310monkeyfist2mf4core9hex__cell(x.cell, w), x.kind);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return m;
  }
  function _M0FP310monkeyfist2mf4core10hex__point(c, w) {
    const r = c / w | 0;
    return new _M0TP310monkeyfist2mf4core2Pt((c % w | 0) - (r / 2 | 0) | 0, r);
  }
  function _M0FP310monkeyfist2mf4core10ray__track(w, h, head, d0, m, out, turns) {
    const start = out.len;
    let p = _M0FP310monkeyfist2mf4core10hex__point(head, w);
    let d = d0;
    let turned = false;
    while (true) {
      const _tmp = p.q;
      const _tmp$2 = d;
      const _tmp$3 = _tmp + (_tmp$2 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[_tmp$2] : $oob()) | 0;
      const _tmp$4 = p.r;
      const _tmp$5 = d;
      p = new _M0TP310monkeyfist2mf4core2Pt(_tmp$3, _tmp$4 + (_tmp$5 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[_tmp$5] : $oob()) | 0);
      if (!_M0FP310monkeyfist2mf4core11hex__inside(w, h, p)) {
        break;
      }
      const c = _M0FP310monkeyfist2mf4core9hex__cell(p, w);
      const axis = _M0MP310monkeyfist2mf4core9SqMirrors3get(m, c);
      _M0MPC15array5Array4pushGiE(out, c);
      if (axis >= 0) {
        const _p = d;
        const e = ((((Math.imul(2, axis) | 0) - _p | 0) % 6 | 0) + 6 | 0) % 6 | 0;
        if (e !== d) {
          turned = true;
          if (turns === undefined) {
          } else {
            const _Some = turns;
            const _t = _Some;
            if (!_M0FP310monkeyfist2mf4core8contains(_t, c)) {
              _M0MPC15array5Array4pushGiE(_t, c);
            }
          }
        }
        d = e;
        if ((out.len - start | 0) > (Math.imul(Math.imul(2, w) | 0, h) | 0)) {
          return false;
        }
      }
      continue;
    }
    return !(turned && _M0FP310monkeyfist2mf4core8has__dup(out, start));
  }
  function _M0FP310monkeyfist2mf4core12hex__compile(w, h, mirrors, paths) {
    const n = paths.len;
    const area = Math.imul(w, h) | 0;
    const tracks = new _M0TPB5ArrayGAiE([], 0);
    const lengths = $make_array_len_and_init(n, 0);
    const offsets = $make_array_len_and_init(n, -1);
    const occupied = $make_array_len_and_init(area, -1);
    const at = $make_array_len_and_init(area, 0);
    const bent = _M0FP310monkeyfist2mf4core12hex__mirrors(w, h, mirrors);
    let left = 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < n) {
        if (i < 0 || i >= paths.len) {
          $panic();
        }
        const _bind = paths.buf[i];
        if (_bind === undefined) {
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(tracks, $make_array_len_and_init(0, 0));
        } else {
          const _Some = _bind;
          const _path = _Some;
          const _p = _M0MPC15array5Array20unsafe__make__uninitGiE(_path.len);
          const _p$2 = _path.len;
          const _p$3 = _path.buf;
          let _tmp$2 = 0;
          while (true) {
            const _p$4 = _tmp$2;
            if (_p$4 < _p$2) {
              const _p$5 = _p$3[_p$4];
              const _p$6 = _M0FP310monkeyfist2mf4core9hex__cell(_p$5, w);
              _p.buf[_p$4] = _p$6;
              _tmp$2 = _p$4 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const track = _p;
          const _bind$2 = track.len;
          let _tmp$3 = 0;
          while (true) {
            const j = _tmp$3;
            if (j < _bind$2) {
              if (j < 0 || j >= track.len) {
                $panic();
              }
              const _tmp$4 = track.buf[j];
              if (_tmp$4 >>> 0 < occupied.length) {
                occupied[_tmp$4] = i;
              } else {
                $oob();
              }
              if (j < 0 || j >= track.len) {
                $panic();
              }
              const _tmp$5 = track.buf[j];
              if (_tmp$5 >>> 0 < at.length) {
                at[_tmp$5] = j;
              } else {
                $oob();
              }
              _tmp$3 = j + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if (bent.keys.len > 0) {
            const _bind$3 = track.len - 1 | 0;
            if (_bind$3 < 0 || _bind$3 >= track.len) {
              $panic();
            }
            if (!_M0FP310monkeyfist2mf4core10ray__track(w, h, track.buf[_bind$3], _M0FP310monkeyfist2mf4core11exit__index(w, _path, bent), bent, track, undefined)) {
              return undefined;
            }
          } else {
            const _bind$3 = _M0FP310monkeyfist2mf4core9head__dir(_path);
            const _dq = _bind$3._0;
            const _dr = _bind$3._1;
            let p = new _M0TP310monkeyfist2mf4core2Pt(_M0FP310monkeyfist2mf4core4last(_path).q + _dq | 0, _M0FP310monkeyfist2mf4core4last(_path).r + _dr | 0);
            while (true) {
              if (_M0FP310monkeyfist2mf4core11hex__inside(w, h, p)) {
                _M0MPC15array5Array4pushGiE(track, _M0FP310monkeyfist2mf4core9hex__cell(p, w));
                p = new _M0TP310monkeyfist2mf4core2Pt(p.q + _dq | 0, p.r + _dr | 0);
                continue;
              } else {
                break;
              }
            }
          }
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(tracks, _M0MPC15array10FixedArray11from__arrayGiE(new _M0TPB9ArrayViewGiE(track.buf, 0, track.len)));
          if (i >>> 0 < lengths.length) {
            lengths[i] = _path.len;
          } else {
            $oob();
          }
          if (i >>> 0 < offsets.length) {
            offsets[i] = 0;
          } else {
            $oob();
          }
          left = left + 1 | 0;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core8HexBoard(w, n, tracks, lengths, offsets, occupied, at, $make_array_len_and_init(n, 0), left);
  }
  function _M0MP310monkeyfist2mf4core5Board7tracked(self, g) {
    if (self.springs.len > 0) {
      return false;
    }
    if (g.tracked < 0) {
      let ok;
      if (self.hex) {
        const _bind = _M0FP310monkeyfist2mf4core12hex__compile(self.w, self.h, self.mirrors, _M0FP310monkeyfist2mf4core11some__paths(self.ropes));
        ok = !(_bind === undefined);
      } else {
        const _bind = _M0FP310monkeyfist2mf4core9sq__board(_M0FP310monkeyfist2mf4core11some__paths(self.ropes), self.w, self.h, g.sqm);
        ok = !(_bind === undefined);
      }
      g.tracked = ok ? 1 : 0;
    }
    return g.tracked === 1;
  }
  function _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, paths) {
    const _bind = _M0FP310monkeyfist2mf4core12hex__compile(w, h, mirrors, paths);
    if (_bind === undefined) {
      return $panic("A rope's way out passes a cell twice");
    } else {
      const _Some = _bind;
      return _Some;
    }
  }
  function _M0MP310monkeyfist2mf4core8HexBoard2to(self, i) {
    let _tmp;
    if (i < 0) {
      _tmp = true;
    } else {
      let _tmp$2;
      if (i >= self.n) {
        _tmp$2 = true;
      } else {
        const _tmp$3 = self.offsets;
        _tmp$2 = (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) < 0;
      }
      _tmp = _tmp$2;
    }
    if (_tmp) {
      return -2;
    }
    const _bind = self.tracks;
    if (i < 0 || i >= _bind.len) {
      $panic();
    }
    const track = _bind.buf[i];
    const _tmp$2 = self.lengths;
    const length = i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob();
    const _tmp$3 = self.offsets;
    let p = (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) + length | 0;
    while (true) {
      let _tmp$4;
      if (p < track.length) {
        const _tmp$5 = self.occupied;
        const _tmp$6 = p;
        const _tmp$7 = _tmp$6 >>> 0 < track.length ? track[_tmp$6] : $oob();
        _tmp$4 = (_tmp$7 >>> 0 < _tmp$5.length ? _tmp$5[_tmp$7] : $oob()) < 0;
      } else {
        _tmp$4 = false;
      }
      if (_tmp$4) {
        p = p + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return p === track.length ? -1 : p - length | 0;
  }
  function _M0MP310monkeyfist2mf4core8HexBoard4free(self) {
    const _bind = self.n;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        let _tmp$2;
        const _tmp$3 = self.offsets;
        if ((i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) >= 0) {
          _tmp$2 = _M0MP310monkeyfist2mf4core8HexBoard2to(self, i) !== -1;
        } else {
          _tmp$2 = false;
        }
        if (_tmp$2) {
          return false;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return true;
  }
  function _M0MP310monkeyfist2mf4core5Board9all__free(self, g, paths) {
    return _M0MP310monkeyfist2mf4core5Board7tracked(self, g) ? (self.hex ? _M0MP310monkeyfist2mf4core8HexBoard4free(_M0FP310monkeyfist2mf4core17hex__compile__exn(self.w, self.h, self.mirrors, paths)) : _M0FP310monkeyfist2mf4core8sq__free(paths, self.w, self.h, g.sqm)) : _M0MP310monkeyfist2mf4core3Geo15all__free__full(g, paths);
  }
  function _M0MP310monkeyfist2mf4core8HexBoard5paths(self) {
    const _p = self.n;
    if (_p <= 0) {
      return new _M0TPB5ArrayGORPB5ArrayGRP310monkeyfist2mf4core2PtEE([], 0);
    } else {
      const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(_p);
      let _tmp = 0;
      while (true) {
        const _p$3 = _tmp;
        if (_p$3 < _p) {
          let _p$4;
          const _tmp$2 = self.offsets;
          if ((_p$3 >>> 0 < _tmp$2.length ? _tmp$2[_p$3] : $oob()) < 0) {
            _p$4 = undefined;
          } else {
            const _p$5 = self.tracks;
            if (_p$3 < 0 || _p$3 >= _p$5.len) {
              $panic();
            }
            const _p$6 = _p$5.buf[_p$3];
            const _tmp$3 = self.lengths;
            const _p$7 = _p$3 >>> 0 < _tmp$3.length ? _tmp$3[_p$3] : $oob();
            if (_p$7 <= 0) {
              _p$4 = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
            } else {
              const _p$8 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p$7);
              let _tmp$4 = 0;
              while (true) {
                const _p$9 = _tmp$4;
                if (_p$9 < _p$7) {
                  const _tmp$5 = self.offsets;
                  const _tmp$6 = (_p$3 >>> 0 < _tmp$5.length ? _tmp$5[_p$3] : $oob()) + _p$9 | 0;
                  const _p$10 = _M0FP310monkeyfist2mf4core10hex__point(_tmp$6 >>> 0 < _p$6.length ? _p$6[_tmp$6] : $oob(), self.w);
                  _p$8.buf[_p$9] = _p$10;
                  _tmp$4 = _p$9 + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              _p$4 = _p$8;
            }
          }
          _p$2.buf[_p$3] = _p$4;
          _tmp = _p$3 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      return _p$2;
    }
  }
  function _M0MP310monkeyfist2mf4core8HexBoard5place(self, i, target) {
    const _tmp = self.offsets;
    const from = i >>> 0 < _tmp.length ? _tmp[i] : $oob();
    const _bind = self.tracks;
    if (i < 0 || i >= _bind.len) {
      $panic();
    }
    const track = _bind.buf[i];
    const _tmp$2 = self.lengths;
    const length = i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob();
    if (from >= 0) {
      const _bind$2 = from + length | 0;
      let _tmp$3 = from;
      while (true) {
        const j = _tmp$3;
        if (j < _bind$2) {
          const _tmp$4 = self.occupied;
          const _tmp$5 = j >>> 0 < track.length ? track[j] : $oob();
          if (_tmp$5 >>> 0 < _tmp$4.length) {
            _tmp$4[_tmp$5] = -1;
          } else {
            $oob();
          }
          _tmp$3 = j + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      self.left = self.left - 1 | 0;
    }
    if (target >= 0) {
      const _bind$2 = target + length | 0;
      let _tmp$3 = target;
      while (true) {
        const j = _tmp$3;
        if (j < _bind$2) {
          const _tmp$4 = self.occupied;
          const _tmp$5 = j >>> 0 < track.length ? track[j] : $oob();
          if (_tmp$5 >>> 0 < _tmp$4.length) {
            _tmp$4[_tmp$5] = i;
          } else {
            $oob();
          }
          const _tmp$6 = self.at;
          const _tmp$7 = j >>> 0 < track.length ? track[j] : $oob();
          if (_tmp$7 >>> 0 < _tmp$6.length) {
            _tmp$6[_tmp$7] = j;
          } else {
            $oob();
          }
          _tmp$3 = j + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      self.left = self.left + 1 | 0;
    }
    const _tmp$3 = self.offsets;
    if (i >>> 0 < _tmp$3.length) {
      _tmp$3[i] = target;
    } else {
      $oob();
    }
  }
  function _M0FP310monkeyfist2mf4core11hex__replay(w, h, mirrors, moves, paths) {
    const board = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, paths);
    const events = new _M0TPB5ArrayGiE([], 0);
    let taps = 0;
    let automatic = false;
    const _bind = moves.len;
    const _bind$2 = moves.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const i = _bind$2[_];
        const target = _M0MP310monkeyfist2mf4core8HexBoard2to(board, i);
        let _tmp$2;
        if (target === -2) {
          _tmp$2 = true;
        } else {
          const _tmp$3 = board.offsets;
          _tmp$2 = target === (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob());
        }
        if (_tmp$2) {
          const _bind$3 = _M0MP310monkeyfist2mf4core8HexBoard5paths(board);
          const _bind$4 = taps;
          return new _M0TP310monkeyfist2mf4core8Replayed(false, _bind$4, events, _bind$3);
        }
        if (!automatic) {
          taps = taps + 1 | 0;
        }
        _M0MP310monkeyfist2mf4core8HexBoard5place(board, i, target);
        _M0MPC15array5Array4pushGiE(events, target < 0 ? 0 : 2);
        if (_M0MP310monkeyfist2mf4core8HexBoard4free(board)) {
          automatic = true;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$3 = board.left === 0;
    const _bind$4 = _M0MP310monkeyfist2mf4core8HexBoard5paths(board);
    const _bind$5 = taps;
    return new _M0TP310monkeyfist2mf4core8Replayed(_bind$3, _bind$5, events, _bind$4);
  }
  function _M0MP310monkeyfist2mf4core5Board6replay(self, g, moves, paths) {
    if (_M0MP310monkeyfist2mf4core5Board7tracked(self, g)) {
      if (self.hex) {
        return _M0FP310monkeyfist2mf4core11hex__replay(self.w, self.h, self.mirrors, moves, paths);
      }
      return _M0FP310monkeyfist2mf4core10sq__replay(paths, self.w, self.h, moves, g.sqm);
    }
    let taps = 0;
    let automatic = false;
    const events = new _M0TPB5ArrayGiE([], 0);
    let cur = paths;
    const _bind = moves.len;
    const _bind$2 = moves.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const i = _bind$2[_];
        const _bind$3 = _M0MP310monkeyfist2mf4core3Geo3tap(g, cur, i);
        if (_bind$3 === undefined) {
          const _bind$4 = cur;
          const _bind$5 = taps;
          return new _M0TP310monkeyfist2mf4core8Replayed(false, _bind$5, events, _bind$4);
        } else {
          const _Some = _bind$3;
          const _m = _Some;
          if (!automatic) {
            taps = taps + 1 | 0;
          }
          cur = _m.paths;
          _M0MPC15array5Array4pushGiE(events, _m.event);
          if (_M0MP310monkeyfist2mf4core5Board9all__free(self, g, cur)) {
            automatic = true;
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$3 = _M0FP310monkeyfist2mf4core9all__gone(cur);
    const _bind$4 = cur;
    const _bind$5 = taps;
    return new _M0TP310monkeyfist2mf4core8Replayed(_bind$3, _bind$5, events, _bind$4);
  }
  function _M0MP310monkeyfist2mf4core5Board12replay__plan(self, g, plan) {
    return _M0MP310monkeyfist2mf4core5Board6replay(self, g, plan, _M0FP310monkeyfist2mf4core11some__paths(self.ropes));
  }
  function _M0FP310monkeyfist2mf4core12offsets__key(o) {
    return _M0FP310monkeyfist2mf4core7key__of(o);
  }
  function _M0MP310monkeyfist2mf4core8HexBoard7relaxed(self) {
    const reach = self.reach;
    const _bind = self.n;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const _tmp$2 = self.offsets;
        if (i >>> 0 < reach.length) {
          reach[i] = i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob();
        } else {
          $oob();
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let changed = true;
    while (true) {
      if (changed) {
        changed = false;
        const _bind$2 = self.n;
        let _tmp$2 = 0;
        while (true) {
          const i = _tmp$2;
          if (i < _bind$2) {
            _L: {
              if ((i >>> 0 < reach.length ? reach[i] : $oob()) < 0) {
                break _L;
              }
              const _bind$3 = self.tracks;
              if (i < 0 || i >= _bind$3.len) {
                $panic();
              }
              const track = _bind$3.buf[i];
              const _tmp$3 = self.lengths;
              const length = i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob();
              let next = i >>> 0 < reach.length ? reach[i] : $oob();
              while (true) {
                const j = next + length | 0;
                if (j >= track.length) {
                  next = -1;
                  break;
                }
                const c = j >>> 0 < track.length ? track[j] : $oob();
                const _tmp$4 = self.occupied;
                const owner = c >>> 0 < _tmp$4.length ? _tmp$4[c] : $oob();
                let _tmp$5;
                if (owner >= 0) {
                  let _tmp$6;
                  if ((owner >>> 0 < reach.length ? reach[owner] : $oob()) >= 0) {
                    const _tmp$7 = owner === i ? next : owner >>> 0 < reach.length ? reach[owner] : $oob();
                    const _tmp$8 = self.at;
                    _tmp$6 = _tmp$7 <= (c >>> 0 < _tmp$8.length ? _tmp$8[c] : $oob());
                  } else {
                    _tmp$6 = false;
                  }
                  _tmp$5 = _tmp$6;
                } else {
                  _tmp$5 = false;
                }
                if (_tmp$5) {
                  break;
                }
                next = next + 1 | 0;
                continue;
              }
              if (next !== (i >>> 0 < reach.length ? reach[i] : $oob())) {
                if (i >>> 0 < reach.length) {
                  reach[i] = next;
                } else {
                  $oob();
                }
                changed = true;
              }
              break _L;
            }
            _tmp$2 = i + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        continue;
      } else {
        break;
      }
    }
    return reach;
  }
  function _M0MP310monkeyfist2mf4core8HexBoard4dead(self) {
    const reach = _M0MP310monkeyfist2mf4core8HexBoard7relaxed(self);
    const _bind = self.n;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        if ((i >>> 0 < reach.length ? reach[i] : $oob()) >= 0) {
          return true;
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0FP310monkeyfist2mf4core10hex__solveN6searchS4774(_env, preferred) {
    const exhausted = _env._6;
    const moves = _env._5;
    const nodes = _env._4;
    const paths = _env._3;
    const budget = _env._2;
    const board = _env._1;
    const seen = _env._0;
    if (board.left === 0) {
      return true;
    }
    const state = _M0FP310monkeyfist2mf4core12offsets__key(board.offsets);
    if (_M0MPB3Map8containsGsbE(seen, state)) {
      return false;
    }
    nodes.val = nodes.val + 1 | 0;
    if (nodes.val > budget) {
      exhausted.val = true;
      return false;
    }
    _M0MPB3Map3setGsbE(seen, state, true);
    if (_M0MP310monkeyfist2mf4core8HexBoard4dead(board)) {
      return false;
    }
    let p0;
    if ((preferred.end - preferred.start | 0) > 0) {
      if (0 >= (preferred.end - preferred.start | 0)) {
        $panic();
      }
      p0 = preferred.buf[preferred.start];
    } else {
      p0 = -1;
    }
    const tries = new _M0TPB5ArrayGUiiEE([], 0);
    const _bind = paths.len;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const target = _M0MP310monkeyfist2mf4core8HexBoard2to(board, i);
        let _tmp$2;
        if (target !== -2) {
          const _tmp$3 = board.offsets;
          _tmp$2 = target !== (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob());
        } else {
          _tmp$2 = false;
        }
        if (_tmp$2) {
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(tries, { _0: i, _1: target });
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0FP310monkeyfist2mf4core5ssortGUiiEE(tries, (a, b) => a._0 === p0 ? -1 : b._0 === p0 ? 1 : (a._1 < 0 ? 0 : 1) - (b._1 < 0 ? 0 : 1) | 0);
    const _bind$2 = tries.len;
    const _bind$3 = tries.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$2) {
        const t = _bind$3[_];
        const _i = t._0;
        const _target = t._1;
        const _tmp$3 = board.offsets;
        const from = _i >>> 0 < _tmp$3.length ? _tmp$3[_i] : $oob();
        _M0MP310monkeyfist2mf4core8HexBoard5place(board, _i, _target);
        _M0MPC15array5Array4pushGiE(moves, _i);
        if (_M0FP310monkeyfist2mf4core10hex__solveN6searchS4774(_env, _i === p0 ? _M0MPC15array9ArrayView21clamped__view_2einnerGiE(preferred, 1, undefined) : preferred)) {
          return true;
        }
        _M0MP310monkeyfist2mf4core8HexBoard5place(board, _i, from);
        _M0MPC15array5Array3popGiE(moves);
        if (exhausted.val) {
          break;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0FP310monkeyfist2mf4core10hex__solve(w, h, mirrors, paths, budget, prefer) {
    const board = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, paths);
    const _bind = [];
    const seen = _M0MPB3Map3MapGsbE(new _M0TPB9ArrayViewGUsbEE(_bind, 0, 0), undefined);
    const moves = new _M0TPB5ArrayGiE([], 0);
    const nodes = new _M0TPB8MutLocalGiE(0);
    const exhausted = new _M0TPB8MutLocalGbE(false);
    const _env = { _0: seen, _1: board, _2: budget, _3: paths, _4: nodes, _5: moves, _6: exhausted };
    const solved = _M0FP310monkeyfist2mf4core10hex__solveN6searchS4774(_env, new _M0TPB9ArrayViewGiE(prefer.buf, 0, prefer.len));
    return new _M0TP310monkeyfist2mf4core6Solved(solved ? _M0FP310monkeyfist2mf4core10hex__solveN6constrS4775 : exhausted.val ? -1 : _M0FP310monkeyfist2mf4core10hex__solveN6constrS4776, solved ? moves : new _M0TPB5ArrayGiE([], 0), nodes.val);
  }
  function _M0MP310monkeyfist2mf4core5Board5solve(self, g, paths, budget, prefer) {
    if (!_M0MP310monkeyfist2mf4core5Board7tracked(self, g)) {
      return _M0MP310monkeyfist2mf4core3Geo11solve__full(g, paths, budget, prefer);
    }
    return self.hex ? _M0FP310monkeyfist2mf4core10hex__solve(self.w, self.h, self.mirrors, paths, budget, prefer) : _M0FP310monkeyfist2mf4core9sq__solve(paths, self.w, self.h, budget, prefer, g.sqm);
  }
  function _M0MP310monkeyfist2mf4core5Board13minimum__taps(self, g, fallback, budget) {
    const verified = _M0MP310monkeyfist2mf4core5Board12replay__plan(self, g, fallback);
    if (!verified.solved) {
      $panic("Par requires a complete solution");
    }
    const start = _M0FP310monkeyfist2mf4core11some__paths(self.ropes);
    const qpaths = new _M0TPB5ArrayGRPB5ArrayGORPB5ArrayGRP310monkeyfist2mf4core2PtEEE([start], 1);
    const qparent = new _M0TPB5ArrayGiE([-1], 1);
    const qmove = new _M0TPB5ArrayGiE([-1], 1);
    const qdepth = new _M0TPB5ArrayGiE([0], 1);
    const _bind = [];
    const seen = _M0MPB3Map3MapGsbE(new _M0TPB9ArrayViewGUsbEE(_bind, 0, 0), undefined);
    _M0MPB3Map3setGsbE(seen, _M0MP310monkeyfist2mf4core3Geo3key(g, start), true);
    let q = 0;
    while (true) {
      if (q < qpaths.len) {
        if (q >= budget) {
          return new _M0TP310monkeyfist2mf4core3Par(_M0MPC15array5Array4copyGiE(fallback), verified.taps, false);
        }
        const _bind$2 = q;
        if (_bind$2 < 0 || _bind$2 >= qpaths.len) {
          $panic();
        }
        const paths = qpaths.buf[_bind$2];
        const _bind$3 = q;
        if (_bind$3 < 0 || _bind$3 >= qdepth.len) {
          $panic();
        }
        const depth = qdepth.buf[_bind$3];
        if (depth >= verified.taps) {
          q = q + 1 | 0;
          continue;
        }
        if (_M0MP310monkeyfist2mf4core5Board9all__free(self, g, paths)) {
          const plan = new _M0TPB5ArrayGiE([], 0);
          let node = q;
          while (true) {
            const _bind$4 = node;
            if (_bind$4 < 0 || _bind$4 >= qparent.len) {
              $panic();
            }
            if (qparent.buf[_bind$4] >= 0) {
              const _bind$5 = node;
              if (_bind$5 < 0 || _bind$5 >= qmove.len) {
                $panic();
              }
              _M0MPC15array5Array4pushGiE(plan, qmove.buf[_bind$5]);
              const _bind$6 = node;
              if (_bind$6 < 0 || _bind$6 >= qparent.len) {
                $panic();
              }
              node = qparent.buf[_bind$6];
              continue;
            } else {
              break;
            }
          }
          _M0MPC15array5Array14rev__in__placeGiE(plan);
          let any = false;
          const _bind$4 = paths.len;
          const _bind$5 = paths.buf;
          let _tmp = 0;
          while (true) {
            const i = _tmp;
            if (i < _bind$4) {
              const p = _bind$5[i];
              if (p === undefined) {
              } else {
                _M0MPC15array5Array4pushGiE(plan, i);
                any = true;
              }
              _tmp = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const _p = any ? 1 : 0;
          return new _M0TP310monkeyfist2mf4core3Par(plan, _p > depth ? _p : depth, true);
        }
        const _bind$4 = paths.len;
        let _tmp = 0;
        while (true) {
          const i = _tmp;
          if (i < _bind$4) {
            _L: {
              if (i < 0 || i >= paths.len) {
                $panic();
              }
              const _bind$5 = paths.buf[i];
              if (_bind$5 === undefined) {
                break _L;
              }
              const _bind$6 = _M0MP310monkeyfist2mf4core3Geo3tap(g, paths, i);
              if (_bind$6 === undefined) {
                break _L;
              } else {
                const _Some = _bind$6;
                const _next = _Some;
                const key = _M0MP310monkeyfist2mf4core3Geo3key(g, _next.paths);
                if (_M0MPB3Map8containsGsbE(seen, key)) {
                  break _L;
                }
                _M0MPB3Map3setGsbE(seen, key, true);
                _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(qpaths, _next.paths);
                _M0MPC15array5Array4pushGiE(qparent, q);
                _M0MPC15array5Array4pushGiE(qmove, i);
                _M0MPC15array5Array4pushGiE(qdepth, depth + 1 | 0);
              }
              break _L;
            }
            _tmp = i + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        q = q + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core3Par(_M0MPC15array5Array4copyGiE(fallback), verified.taps, true);
  }
  function _M0FP310monkeyfist2mf4core12hex__turning(w, h, mirrors, paths) {
    const bent = _M0FP310monkeyfist2mf4core12hex__mirrors(w, h, mirrors);
    const turns = new _M0TPB5ArrayGiE([], 0);
    const _bind = paths.len;
    const _bind$2 = paths.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const path = _bind$2[_];
        _M0FP310monkeyfist2mf4core10ray__track(w, h, _M0FP310monkeyfist2mf4core9hex__cell(_M0FP310monkeyfist2mf4core4last(path), w), _M0FP310monkeyfist2mf4core11exit__index(w, path, bent), bent, new _M0TPB5ArrayGiE([], 0), turns);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return turns;
  }
  function _M0FP310monkeyfist2mf4core20hex__postpone__exits(w, h, mirrors, ropes, plan) {
    const start = _M0FP310monkeyfist2mf4core11some__paths(ropes);
    let best = _M0MPC15array5Array4copyGiE(plan);
    let result = _M0FP310monkeyfist2mf4core11hex__replay(w, h, mirrors, best, start);
    if (!result.solved) {
      return undefined;
    }
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < 2) {
        let improved = false;
        let _tmp$2 = best.len - 1 | 0;
        while (true) {
          const k = _tmp$2;
          if (k >= 0) {
            _L: {
              const _bind = best;
              if (k < 0 || k >= _bind.len) {
                $panic();
              }
              const i = _bind.buf[k];
              if (_M0FP310monkeyfist2mf4core11index__from(best, i, k + 1 | 0) >= 0) {
                break _L;
              }
              const trial = _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(best, 0, k));
              const _bind$2 = k + 1 | 0;
              const _bind$3 = best.len;
              let _tmp$3 = _bind$2;
              while (true) {
                const j = _tmp$3;
                if (j < _bind$3) {
                  const _bind$4 = best;
                  if (j < 0 || j >= _bind$4.len) {
                    $panic();
                  }
                  _M0MPC15array5Array4pushGiE(trial, _bind$4.buf[j]);
                  _tmp$3 = j + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              _M0MPC15array5Array4pushGiE(trial, i);
              const r = _M0FP310monkeyfist2mf4core11hex__replay(w, h, mirrors, trial, start);
              if (r.solved && r.taps < result.taps) {
                best = trial;
                result = r;
                improved = true;
              }
              break _L;
            }
            _tmp$2 = k - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        if (!improved) {
          break;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return best;
  }
  function _M0FP310monkeyfist2mf4core17hex__casual__wins(w, h, mirrors, ropes, rng, games) {
    let wins = 0;
    const exits = new _M0TPB5ArrayGiE([], 0);
    const moves = new _M0TPB5ArrayGiE([], 0);
    const start = _M0FP310monkeyfist2mf4core11some__paths(ropes);
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < games) {
        const b = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, start);
        while (true) {
          _M0MPC15array5Array5clearGiE(exits);
          _M0MPC15array5Array5clearGiE(moves);
          const _bind = ropes.len;
          let _tmp$2 = 0;
          while (true) {
            const i = _tmp$2;
            if (i < _bind) {
              const _tmp$3 = b.offsets;
              if ((i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) >= 0) {
                const t = _M0MP310monkeyfist2mf4core8HexBoard2to(b, i);
                if (t === -1) {
                  _M0MPC15array5Array4pushGiE(exits, i);
                } else {
                  const _tmp$4 = b.offsets;
                  if (t !== (i >>> 0 < _tmp$4.length ? _tmp$4[i] : $oob())) {
                    _M0MPC15array5Array4pushGiE(moves, i);
                    _M0MPC15array5Array4pushGiE(moves, t);
                  }
                }
              }
              _tmp$2 = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if (exits.len > 0) {
            const _bind$2 = _M0MP310monkeyfist2mf4core3Rng5below(rng, exits.len);
            if (_bind$2 < 0 || _bind$2 >= exits.len) {
              $panic();
            }
            _M0MP310monkeyfist2mf4core8HexBoard5place(b, exits.buf[_bind$2], -1);
          } else {
            if (moves.len > 0) {
              const k = Math.imul(2, _M0MPC16double6Double7to__int(_M0MPC16double6Double5floor(_M0MP310monkeyfist2mf4core3Rng4next(rng) * (moves.len + 0) / 2))) | 0;
              if (k < 0 || k >= moves.len) {
                $panic();
              }
              const _tmp$3 = moves.buf[k];
              const _bind$2 = k + 1 | 0;
              if (_bind$2 < 0 || _bind$2 >= moves.len) {
                $panic();
              }
              _M0MP310monkeyfist2mf4core8HexBoard5place(b, _tmp$3, moves.buf[_bind$2]);
            } else {
              break;
            }
          }
          if (b.left === 0) {
            wins = wins + 1 | 0;
            break;
          }
          continue;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return (wins + 0) / ((1 > games ? 1 : games) + 0);
  }
  function _M0FP310monkeyfist2mf4core25hex__fewest__player__tapsN5boundS4916(_env) {
    const n = _env._2;
    const b = _env._1;
    const blockers = _env._0;
    _M0MPC15array10FixedArray12fill_2einnerGbE(blockers, false, 0, undefined);
    let count = 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < n) {
        const _tmp$2 = b.offsets;
        if ((i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob()) >= 0) {
          const _bind = b.tracks;
          if (i < 0 || i >= _bind.len) {
            $panic();
          }
          const t = _bind.buf[i];
          const _tmp$3 = b.offsets;
          const _tmp$4 = i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob();
          const _tmp$5 = b.lengths;
          const _bind$2 = _tmp$4 + (i >>> 0 < _tmp$5.length ? _tmp$5[i] : $oob()) | 0;
          const _bind$3 = t.length;
          let _tmp$6 = _bind$2;
          while (true) {
            const k = _tmp$6;
            if (k < _bind$3) {
              const _tmp$7 = b.occupied;
              const _tmp$8 = k >>> 0 < t.length ? t[k] : $oob();
              const owner = _tmp$8 >>> 0 < _tmp$7.length ? _tmp$7[_tmp$8] : $oob();
              if (owner >= 0 && !(owner >>> 0 < blockers.length ? blockers[owner] : $oob())) {
                if (owner >>> 0 < blockers.length) {
                  blockers[owner] = true;
                } else {
                  $oob();
                }
                count = count + 1 | 0;
              }
              _tmp$6 = k + 1 | 0;
              continue;
            } else {
              break;
            }
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return count;
  }
  function _M0FP310monkeyfist2mf4core25hex__fewest__player__tapsN6searchS4917(_env, remaining) {
    const budget = _env._9;
    const later = _env._8;
    const _env$2 = _env._7;
    const moves = _env._6;
    const n = _env._5;
    const b = _env._4;
    const rank = _env._3;
    const tried = _env._2;
    const exhausted = _env._1;
    const nodes = _env._0;
    if (_M0MP310monkeyfist2mf4core8HexBoard4free(b)) {
      return true;
    }
    if (remaining === 0 || _M0FP310monkeyfist2mf4core25hex__fewest__player__tapsN5boundS4916(_env$2) > remaining) {
      return false;
    }
    nodes.val = nodes.val + 1 | 0;
    if (nodes.val > budget) {
      exhausted.val = true;
      return false;
    }
    const state = _M0FP310monkeyfist2mf4core12offsets__key(b.offsets);
    const _bind = _M0MPB3Map3getGsiE(tried, state);
    if (_bind === undefined) {
    } else {
      const _Some = _bind;
      const _t = _Some;
      if (_t >= remaining) {
        return false;
      }
    }
    if (_M0MP310monkeyfist2mf4core8HexBoard4dead(b)) {
      _M0MPB3Map3setGsiE(tried, state, 1000000);
      return false;
    }
    const choices = new _M0TPB5ArrayGUiiiEE([], 0);
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < n) {
        const to = _M0MP310monkeyfist2mf4core8HexBoard2to(b, i);
        let _tmp$2;
        if (to !== -2) {
          const _tmp$3 = b.offsets;
          _tmp$2 = to !== (i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob());
        } else {
          _tmp$2 = false;
        }
        if (_tmp$2) {
          let _tmp$3;
          const _tmp$4 = b.offsets;
          if ((i >>> 0 < _tmp$4.length ? _tmp$4[i] : $oob()) !== 0) {
            _tmp$3 = i >>> 0 < later.length ? later[i] : $oob();
          } else {
            _tmp$3 = i >>> 0 < rank.length ? rank[i] : $oob();
          }
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(choices, { _0: i, _1: to, _2: _tmp$3 });
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0FP310monkeyfist2mf4core5ssortGUiiEE(choices, (a, c) => a._2 !== c._2 ? a._2 - c._2 | 0 : a._0 - c._0 | 0);
    const _bind$2 = choices.len;
    const _bind$3 = choices.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$2) {
        const t = _bind$3[_];
        const _i = t._0;
        const _to = t._1;
        const _tmp$3 = b.offsets;
        const from = _i >>> 0 < _tmp$3.length ? _tmp$3[_i] : $oob();
        _M0MP310monkeyfist2mf4core8HexBoard5place(b, _i, _to);
        _M0MPC15array5Array4pushGiE(moves, _i);
        if (_M0FP310monkeyfist2mf4core25hex__fewest__player__tapsN6searchS4917(_env, remaining - 1 | 0)) {
          return true;
        }
        _M0MPC15array5Array3popGiE(moves);
        _M0MP310monkeyfist2mf4core8HexBoard5place(b, _i, from);
        if (exhausted.val) {
          return false;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MPB3Map3setGsiE(tried, state, remaining);
    return false;
  }
  function _M0FP310monkeyfist2mf4core25hex__fewest__player__taps(w, h, mirrors, ropes, fallback, budget) {
    const start = _M0FP310monkeyfist2mf4core11some__paths(ropes);
    const verified = _M0FP310monkeyfist2mf4core11hex__replay(w, h, mirrors, fallback, start);
    if (!verified.solved) {
      $panic("Par requires a replayable Hex solution");
    }
    const b = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, start);
    const n = b.n;
    const moves = new _M0TPB5ArrayGiE([], 0);
    const _bind = [];
    const tried = _M0MPB3Map3MapGsiE(new _M0TPB9ArrayViewGUsiEE(_bind, 0, 0), undefined);
    const rank = $make_array_len_and_init(n, 1000000);
    const later = $make_array_len_and_init(n, 1000000);
    const _bind$2 = fallback.len;
    const _bind$3 = fallback.buf;
    let _tmp = 0;
    while (true) {
      const step = _tmp;
      if (step < _bind$2) {
        const id = _bind$3[step];
        if ((id >>> 0 < rank.length ? rank[id] : $oob()) === 1000000) {
          if (id >>> 0 < rank.length) {
            rank[id] = step;
          } else {
            $oob();
          }
        }
        if (id >>> 0 < later.length) {
          later[id] = step;
        } else {
          $oob();
        }
        _tmp = step + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const nodes = new _M0TPB8MutLocalGiE(0);
    const exhausted = new _M0TPB8MutLocalGbE(false);
    const blockers = $make_array_len_and_init(n, false);
    const _env = { _0: blockers, _1: b, _2: n };
    const _env$2 = { _0: nodes, _1: exhausted, _2: tried, _3: rank, _4: b, _5: n, _6: moves, _7: _env, _8: later, _9: budget };
    const _p = _M0FP310monkeyfist2mf4core25hex__fewest__player__tapsN5boundS4916(_env);
    let taps = 1 > _p ? 1 : _p;
    while (true) {
      if (taps < verified.taps && !exhausted.val) {
        if (_M0FP310monkeyfist2mf4core25hex__fewest__player__tapsN6searchS4917(_env$2, taps)) {
          const manual = moves.len;
          let _tmp$2 = 0;
          while (true) {
            const i = _tmp$2;
            if (i < n) {
              const _tmp$3 = b.offsets;
              if ((i >>> 0 < _tmp$3.length ? _tmp$3[i] : $oob()) >= 0) {
                _M0MPC15array5Array4pushGiE(moves, i);
              }
              _tmp$2 = i + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          return new _M0TP310monkeyfist2mf4core3Par(moves, manual, true);
        }
        taps = taps + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core3Par(_M0MPC15array5Array4copyGiE(fallback), verified.taps, !exhausted.val);
  }
  function _M0FP310monkeyfist2mf4core15hex__intentionsN4stepS4992(_env, i) {
    const stops = _env._6;
    const moves = _env._5;
    const cost = _env._4;
    const moved_at = _env._3;
    const b = _env._2;
    const done = _env._1;
    const released = _env._0;
    const _tmp = b.offsets;
    const from = i >>> 0 < _tmp.length ? _tmp[i] : $oob();
    const target = _M0MP310monkeyfist2mf4core8HexBoard2to(b, i);
    if (target === -2 || target === from) {
      return false;
    }
    if (i < 0 || i >= stops.len) {
      $panic();
    }
    const expected = stops.buf[i];
    let stop;
    if ((i >>> 0 < done.length ? done[i] : $oob()) < expected.len) {
      const _bind = i >>> 0 < done.length ? done[i] : $oob();
      if (_bind < 0 || _bind >= expected.len) {
        $panic();
      }
      stop = expected.buf[_bind];
    } else {
      stop = -1;
    }
    const _tmp$2 = b.lengths;
    const length = i >>> 0 < _tmp$2.length ? _tmp$2[i] : $oob();
    const _bind = b.tracks;
    if (i < 0 || i >= _bind.len) {
      $panic();
    }
    const track = _bind.buf[i];
    if (stop >= 0) {
      let _tmp$3;
      if (target < 0) {
        _tmp$3 = true;
      } else {
        const _tmp$4 = (target + length | 0) - 1 | 0;
        _tmp$3 = (_tmp$4 >>> 0 < track.length ? track[_tmp$4] : $oob()) !== stop;
      }
      if (_tmp$3) {
        return false;
      }
    } else {
      if (target !== -1) {
        return false;
      }
    }
    let layer = i >>> 0 < moved_at.length ? moved_at[i] : $oob();
    const end = target < 0 ? track.length : target + length | 0;
    const _bind$2 = from + length | 0;
    let _tmp$3 = _bind$2;
    while (true) {
      const j = _tmp$3;
      if (j < end) {
        const _p = layer;
        const _tmp$4 = j >>> 0 < track.length ? track[j] : $oob();
        const _p$2 = _tmp$4 >>> 0 < released.length ? released[_tmp$4] : $oob();
        layer = _p > _p$2 ? _p : _p$2;
        _tmp$3 = j + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    if (target >= 0) {
      const _tmp$4 = b.occupied;
      const _tmp$5 = end >>> 0 < track.length ? track[end] : $oob();
      const owner = _tmp$5 >>> 0 < _tmp$4.length ? _tmp$4[_tmp$5] : $oob();
      if (owner >= 0) {
        const _p = layer;
        const _p$2 = owner >>> 0 < moved_at.length ? moved_at[owner] : $oob();
        layer = _p > _p$2 ? _p : _p$2;
      }
    }
    layer = layer + 1 | 0;
    if (i >>> 0 < moved_at.length) {
      moved_at[i] = layer;
    } else {
      $oob();
    }
    let stop_at;
    if (target < 0) {
      stop_at = from + length | 0;
    } else {
      const _p = from + length | 0;
      stop_at = _p < target ? _p : target;
    }
    let _tmp$4 = from;
    while (true) {
      const j = _tmp$4;
      if (j < stop_at) {
        const _tmp$5 = j >>> 0 < track.length ? track[j] : $oob();
        if (_tmp$5 >>> 0 < released.length) {
          released[_tmp$5] = layer;
        } else {
          $oob();
        }
        _tmp$4 = j + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MP310monkeyfist2mf4core8HexBoard5place(b, i, target);
    if (i >>> 0 < done.length) {
      done[i] = (i >>> 0 < done.length ? done[i] : $oob()) + 1 | 0;
    } else {
      $oob();
    }
    _M0MPC15array5Array4pushGiE(moves, i);
    if (target < 0) {
      cost.val = cost.val + layer | 0;
    }
    return true;
  }
  function _M0FP310monkeyfist2mf4core15hex__intentions(w, h, mirrors, ropes, stops, certificate) {
    const b = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, _M0FP310monkeyfist2mf4core11some__paths(ropes));
    const n = ropes.len;
    const done = $make_array_len_and_init(n, 0);
    const released = $make_array_len_and_init(Math.imul(w, h) | 0, 0);
    const moved_at = $make_array_len_and_init(n, 0);
    const moves = new _M0TPB5ArrayGiE([], 0);
    const cost = new _M0TPB8MutLocalGiE(0);
    const _env = { _0: released, _1: done, _2: b, _3: moved_at, _4: cost, _5: moves, _6: stops };
    if (certificate === undefined) {
      let changed = true;
      while (true) {
        if (changed && b.left > 0) {
          changed = false;
          let _tmp = n - 1 | 0;
          while (true) {
            const i = _tmp;
            if (i >= 0) {
              if (_M0FP310monkeyfist2mf4core15hex__intentionsN4stepS4992(_env, i)) {
                changed = true;
              }
              _tmp = i - 1 | 0;
              continue;
            } else {
              break;
            }
          }
          continue;
        } else {
          break;
        }
      }
    } else {
      const _Some = certificate;
      const _cert = _Some;
      const _bind = _cert.len;
      const _bind$2 = _cert.buf;
      let _tmp = 0;
      while (true) {
        const _ = _tmp;
        if (_ < _bind) {
          const i = _bind$2[_];
          if (!_M0FP310monkeyfist2mf4core15hex__intentionsN4stepS4992(_env, i)) {
            return undefined;
          }
          _tmp = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
    }
    return b.left > 0 ? undefined : new _M0TP310monkeyfist2mf4core9HexIntent(moves, cost.val);
  }
  function _M0FP310monkeyfist2mf4core10hex__buildN4freeS5044(_env, c) {
    const tile = _env._2;
    const kept = _env._1;
    const occupied = _env._0;
    return c >= 0 && ((c >>> 0 < occupied.length ? occupied[c] : $oob()) < 0 && (!(c >>> 0 < tile.length ? tile[c] : $oob()) && !(c >>> 0 < kept.length ? kept[c] : $oob())));
  }
  function _M0FP310monkeyfist2mf4core10hex__buildN6intentS5045(_env, cert) {
    const stops = _env._4;
    const mirrors = _env._3;
    const h = _env._2;
    const ropes = _env._1;
    const w = _env._0;
    return _M0FP310monkeyfist2mf4core15hex__intentions(w, h, mirrors, ropes, stops, cert);
  }
  function _M0FP310monkeyfist2mf4core10hex__buildN5shapeS5046(_env, want, aim) {
    const h = _env._10;
    const seen = _env._9;
    const bent = _env._8;
    const neighbours = _env._7;
    const points = _env._6;
    const rng = _env._5;
    const stamp = _env._4;
    const w = _env._3;
    const forward = _env._2;
    const _env$2 = _env._1;
    const area = _env._0;
    let head;
    if (aim === undefined) {
      head = -1;
    } else {
      const _Some = aim;
      const _x = _Some;
      head = _x._0;
    }
    if (aim === undefined) {
      let _tmp = 0;
      while (true) {
        const _ = _tmp;
        if (_ < 24) {
          const c = _M0MP310monkeyfist2mf4core3Rng5below(rng, area);
          if (_M0FP310monkeyfist2mf4core10hex__buildN4freeS5044(_env$2, c)) {
            head = c;
            break;
          }
          _tmp = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
    }
    if (head < 0) {
      return undefined;
    }
    let dir;
    if (aim === undefined) {
      dir = _M0MP310monkeyfist2mf4core3Rng5below(rng, 6);
    } else {
      const _Some = aim;
      const _x = _Some;
      dir = _x._1;
    }
    const back = (dir + 3 | 0) % 6 | 0;
    const _bind = head;
    if (_bind < 0 || _bind >= neighbours.len) {
      $panic();
    }
    const _tmp = neighbours.buf[_bind];
    const second = back >>> 0 < _tmp.length ? _tmp[back] : $oob();
    if (!_M0FP310monkeyfist2mf4core10hex__buildN4freeS5044(_env$2, second)) {
      return undefined;
    }
    const turns = new _M0TPB5ArrayGiE([], 0);
    const ahead = new _M0TPB5ArrayGiE([], 0);
    if (bent.keys.len > 0) {
      if (!_M0FP310monkeyfist2mf4core10ray__track(w, h, head, dir, bent, ahead, turns)) {
        return undefined;
      }
    } else {
      const _bind$2 = head;
      if (_bind$2 < 0 || _bind$2 >= neighbours.len) {
        $panic();
      }
      const _tmp$2 = neighbours.buf[_bind$2];
      let c = dir >>> 0 < _tmp$2.length ? _tmp$2[dir] : $oob();
      while (true) {
        if (c >= 0) {
          _M0MPC15array5Array4pushGiE(ahead, c);
          const _bind$3 = c;
          if (_bind$3 < 0 || _bind$3 >= neighbours.len) {
            $panic();
          }
          const _tmp$3 = neighbours.buf[_bind$3];
          c = dir >>> 0 < _tmp$3.length ? _tmp$3[dir] : $oob();
          continue;
        } else {
          break;
        }
      }
    }
    stamp.val = stamp.val + 1 | 0;
    const body = new _M0TPB5ArrayGiE([head, second], 2);
    const _tmp$2 = head;
    if (_tmp$2 >>> 0 < seen.length) {
      seen[_tmp$2] = stamp.val;
    } else {
      $oob();
    }
    if (second >>> 0 < seen.length) {
      seen[second] = stamp.val;
    } else {
      $oob();
    }
    const _bind$2 = ahead.len;
    const _bind$3 = ahead.buf;
    let _tmp$3 = 0;
    while (true) {
      const _ = _tmp$3;
      if (_ < _bind$2) {
        const c = _bind$3[_];
        if (c >>> 0 < forward.length) {
          forward[c] = stamp.val;
        } else {
          $oob();
        }
        _tmp$3 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    if ((second >>> 0 < forward.length ? forward[second] : $oob()) === stamp.val) {
      return undefined;
    }
    let previous = back;
    while (true) {
      if (body.len < want) {
        const choices = new _M0TPB5ArrayGiE([], 0);
        const _bind$4 = body.len - 1 | 0;
        if (_bind$4 < 0 || _bind$4 >= body.len) {
          $panic();
        }
        const tip = body.buf[_bind$4];
        let _tmp$4 = 0;
        while (true) {
          const d = _tmp$4;
          if (d < 6) {
            if (tip < 0 || tip >= neighbours.len) {
              $panic();
            }
            const _tmp$5 = neighbours.buf[tip];
            const c = d >>> 0 < _tmp$5.length ? _tmp$5[d] : $oob();
            if (_M0FP310monkeyfist2mf4core10hex__buildN4freeS5044(_env$2, c) && ((c >>> 0 < seen.length ? seen[c] : $oob()) !== stamp.val && (c >>> 0 < forward.length ? forward[c] : $oob()) !== stamp.val)) {
              _M0MPC15array5Array4pushGiE(choices, d);
            }
            _tmp$4 = d + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        if (choices.len === 0) {
          break;
        }
        let _tmp$5;
        if (_M0FP310monkeyfist2mf4core8contains(choices, previous) && _M0MP310monkeyfist2mf4core3Rng4next(rng) < 0.38) {
          _tmp$5 = previous;
        } else {
          const _bind$5 = _M0MP310monkeyfist2mf4core3Rng5below(rng, choices.len);
          if (_bind$5 < 0 || _bind$5 >= choices.len) {
            $panic();
          }
          _tmp$5 = choices.buf[_bind$5];
        }
        previous = _tmp$5;
        if (tip < 0 || tip >= neighbours.len) {
          $panic();
        }
        const _tmp$6 = neighbours.buf[tip];
        const _tmp$7 = previous;
        const c = _tmp$7 >>> 0 < _tmp$6.length ? _tmp$6[_tmp$7] : $oob();
        if (c >>> 0 < seen.length) {
          seen[c] = stamp.val;
        } else {
          $oob();
        }
        _M0MPC15array5Array4pushGiE(body, c);
        continue;
      } else {
        break;
      }
    }
    if (body.len < 2) {
      return undefined;
    }
    _M0MPC15array5Array14rev__in__placeGiE(body);
    const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(body.len);
    const _p$2 = body.len;
    const _p$3 = body.buf;
    let _tmp$4 = 0;
    while (true) {
      const _p$4 = _tmp$4;
      if (_p$4 < _p$2) {
        const _p$5 = _p$3[_p$4];
        if (_p$5 < 0 || _p$5 >= points.len) {
          $panic();
        }
        const _p$6 = points.buf[_p$5];
        _p.buf[_p$4] = _p$6;
        _tmp$4 = _p$4 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core8HexShape(_p, body, ahead, turns);
  }
  function _M0FP310monkeyfist2mf4core10hex__buildN11note__turnsS5047(_env, path) {
    const h = _env._4;
    const turned_by = _env._3;
    const bent = _env._2;
    const turned_count = _env._1;
    const w = _env._0;
    if (bent.keys.len > 0) {
      const t = new _M0TPB5ArrayGiE([], 0);
      _M0FP310monkeyfist2mf4core10ray__track(w, h, _M0FP310monkeyfist2mf4core9hex__cell(_M0FP310monkeyfist2mf4core4last(path), w), _M0FP310monkeyfist2mf4core11exit__index(w, path, bent), bent, new _M0TPB5ArrayGiE([], 0), t);
      const _bind = t.len;
      const _bind$2 = t.buf;
      let _tmp = 0;
      while (true) {
        const _ = _tmp;
        if (_ < _bind) {
          const c = _bind$2[_];
          if (!(c >>> 0 < turned_by.length ? turned_by[c] : $oob())) {
            if (c >>> 0 < turned_by.length) {
              turned_by[c] = true;
            } else {
              $oob();
            }
            turned_count.val = turned_count.val + 1 | 0;
          }
          _tmp = _ + 1 | 0;
          continue;
        } else {
          return;
        }
      }
    } else {
      return;
    }
  }
  function _M0FP310monkeyfist2mf4core10hex__build(rng, cfg) {
    const w = cfg.w;
    const h = cfg.h;
    const area = Math.imul(w, h) | 0;
    let points;
    if (area <= 0) {
      points = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(area);
      let _tmp = 0;
      while (true) {
        const _p$2 = _tmp;
        if (_p$2 < area) {
          const _p$3 = _M0FP310monkeyfist2mf4core10hex__point(_p$2, w);
          _p.buf[_p$2] = _p$3;
          _tmp = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      points = _p;
    }
    let neighbours;
    if (area <= 0) {
      neighbours = new _M0TPB5ArrayGAiE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGAiE(area);
      let _tmp = 0;
      while (true) {
        const _p$2 = _tmp;
        if (_p$2 < area) {
          const _p$3 = _M0MPC15array10FixedArray5makeiGiE(6, (_p$4) => {
            if (_p$2 < 0 || _p$2 >= points.len) {
              $panic();
            }
            const _tmp$2 = points.buf[_p$2].q + (_p$4 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[_p$4] : $oob()) | 0;
            if (_p$2 < 0 || _p$2 >= points.len) {
              $panic();
            }
            const _p$5 = new _M0TP310monkeyfist2mf4core2Pt(_tmp$2, points.buf[_p$2].r + (_p$4 >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[_p$4] : $oob()) | 0);
            return _M0FP310monkeyfist2mf4core11hex__inside(w, h, _p$5) ? _M0FP310monkeyfist2mf4core9hex__cell(_p$5, w) : -1;
          });
          _p.buf[_p$2] = _p$3;
          _tmp = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      neighbours = _p;
    }
    const occupied = $make_array_len_and_init(area, -1);
    const seen = $make_array_len_and_init(area, 0);
    const forward = $make_array_len_and_init(area, 0);
    const mirrors = cfg.mirrors;
    const ropes = new _M0TPB5ArrayGRPB5ArrayGRP310monkeyfist2mf4core2PtEE([], 0);
    const stops = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
    const stamp = new _M0TPB8MutLocalGiE(0);
    let covered = 0;
    let knots = 0;
    let result = new _M0TP310monkeyfist2mf4core9HexIntent(new _M0TPB5ArrayGiE([], 0), 0);
    const bent = _M0FP310monkeyfist2mf4core12hex__mirrors(w, h, mirrors);
    const tile = $make_array_len_and_init(area, false);
    const _bind = bent.keys;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const c = _bind$3[_];
        if (c >>> 0 < tile.length) {
          tile[c] = true;
        } else {
          $oob();
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const kept = $make_array_len_and_init(area, false);
    const _env = { _0: occupied, _1: kept, _2: tile };
    const _env$2 = { _0: w, _1: ropes, _2: h, _3: mirrors, _4: stops };
    const _env$3 = { _0: area, _1: _env, _2: forward, _3: w, _4: stamp, _5: rng, _6: points, _7: neighbours, _8: bent, _9: seen, _10: h };
    if (cfg.initial_ropes.len > 0) {
      const used = $make_array_len_and_init(area, false);
      let size = 0;
      const _bind$4 = cfg.initial_ropes;
      const _bind$5 = _bind$4.len;
      const _bind$6 = _bind$4.buf;
      let _tmp$2 = 0;
      while (true) {
        const _ = _tmp$2;
        if (_ < _bind$5) {
          const path = _bind$6[_];
          if (path.len < 2) {
            return undefined;
          }
          const _bind$7 = path.len;
          const _bind$8 = path.buf;
          let _tmp$3 = 0;
          while (true) {
            const _$2 = _tmp$3;
            if (_$2 < _bind$7) {
              const p = _bind$8[_$2];
              let _tmp$4;
              if (!_M0FP310monkeyfist2mf4core11hex__inside(w, h, p)) {
                _tmp$4 = true;
              } else {
                const _tmp$5 = _M0FP310monkeyfist2mf4core9hex__cell(p, w);
                _tmp$4 = _tmp$5 >>> 0 < used.length ? used[_tmp$5] : $oob();
              }
              if (_tmp$4) {
                return undefined;
              }
              _tmp$3 = _$2 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const _bind$9 = path.len;
          const _bind$10 = path.buf;
          let _tmp$4 = 0;
          while (true) {
            const _$2 = _tmp$4;
            if (_$2 < _bind$9) {
              const p = _bind$10[_$2];
              const _tmp$5 = _M0FP310monkeyfist2mf4core9hex__cell(p, w);
              if (_tmp$5 >>> 0 < used.length) {
                used[_tmp$5] = true;
              } else {
                $oob();
              }
              size = size + 1 | 0;
              _tmp$4 = _$2 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(ropes, _M0MPC15array5Array4copyGRP310monkeyfist2mf4core2PtE(path));
          _tmp$2 = _ + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      const core = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, _M0FP310monkeyfist2mf4core11some__paths(ropes));
      const _bind$7 = ropes.len;
      let _tmp$3 = 0;
      while (true) {
        const i = _tmp$3;
        if (i < _bind$7) {
          let offs;
          if (i < cfg.initial_stops.len) {
            const _bind$8 = cfg.initial_stops;
            if (i < 0 || i >= _bind$8.len) {
              $panic();
            }
            offs = _bind$8.buf[i];
          } else {
            offs = new _M0TPB5ArrayGiE([], 0);
          }
          const _p = _M0MPC15array5Array20unsafe__make__uninitGiE(offs.len);
          const _p$2 = offs.len;
          const _p$3 = offs.buf;
          let _tmp$4 = 0;
          while (true) {
            const _p$4 = _tmp$4;
            if (_p$4 < _p$2) {
              const _p$5 = _p$3[_p$4];
              const _p$6 = core.tracks;
              if (i < 0 || i >= _p$6.len) {
                $panic();
              }
              const _tmp$5 = _p$6.buf[i];
              const _tmp$6 = core.lengths;
              const _tmp$7 = (_p$5 + (i >>> 0 < _tmp$6.length ? _tmp$6[i] : $oob()) | 0) - 1 | 0;
              const _p$7 = _tmp$7 >>> 0 < _tmp$5.length ? _tmp$5[_tmp$7] : $oob();
              _p.buf[_p$4] = _p$7;
              _tmp$4 = _p$4 + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(stops, _p);
          _tmp$3 = i + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      const _bind$8 = _M0FP310monkeyfist2mf4core10hex__buildN6intentS5045(_env$2, cfg.initial_plan);
      if (_bind$8 === undefined) {
        return undefined;
      } else {
        const _Some = _bind$8;
        const _r = _Some;
        result = _r;
        const _bind$9 = ropes.len;
        const _bind$10 = ropes.buf;
        let _tmp$4 = 0;
        while (true) {
          const i = _tmp$4;
          if (i < _bind$9) {
            const path = _bind$10[i];
            const _bind$11 = path.len;
            const _bind$12 = path.buf;
            let _tmp$5 = 0;
            while (true) {
              const _ = _tmp$5;
              if (_ < _bind$11) {
                const p = _bind$12[_];
                const _tmp$6 = _M0FP310monkeyfist2mf4core9hex__cell(p, w);
                if (_tmp$6 >>> 0 < occupied.length) {
                  occupied[_tmp$6] = i;
                } else {
                  $oob();
                }
                _tmp$5 = _ + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            _tmp$4 = i + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        covered = size;
        const _p = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
        const _p$2 = stops.len;
        const _p$3 = stops.buf;
        let _tmp$5;
        let _tmp$6 = 0;
        while (true) {
          const _p$4 = _tmp$6;
          if (_p$4 < _p$2) {
            const _p$5 = _p$3[_p$4];
            if (_p$5.len > 0) {
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(_p, _p$5);
            }
            _tmp$6 = _p$4 + 1 | 0;
            continue;
          } else {
            _tmp$5 = _p;
            break;
          }
        }
        knots = _tmp$5.len;
      }
    }
    const stage = cfg.stage;
    let attempt = 0;
    while (true) {
      let _tmp$2;
      const _tmp$3 = attempt;
      const _p = Math.imul(area, 24) | 0;
      if (_tmp$3 < (5000 > _p ? 5000 : _p)) {
        _tmp$2 = knots < cfg.knots;
      } else {
        _tmp$2 = false;
      }
      if (_tmp$2) {
        attempt = attempt + 1 | 0;
        const _p$2 = 7 + (stage / 2 | 0) | 0;
        const length = 38 < _p$2 ? 38 : _p$2;
        const base = 4 + (stage / 14 | 0) | 0;
        const _bind$4 = _M0FP310monkeyfist2mf4core10hex__buildN5shapeS5046(_env$3, base + _M0MP310monkeyfist2mf4core3Rng5below(rng, length) | 0, undefined);
        if (_bind$4 === undefined) {
          continue;
        } else {
          const _Some = _bind$4;
          const _a = _Some;
          const _bind$5 = _a.ids;
          const _bind$6 = _bind$5.len;
          const _bind$7 = _bind$5.buf;
          let _tmp$4 = 0;
          while (true) {
            const _ = _tmp$4;
            if (_ < _bind$6) {
              const c = _bind$7[_];
              if (c >>> 0 < occupied.length) {
                occupied[c] = 9999;
              } else {
                $oob();
              }
              _tmp$4 = _ + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          const bs = _M0FP310monkeyfist2mf4core10hex__buildN5shapeS5046(_env$3, base + _M0MP310monkeyfist2mf4core3Rng5below(rng, length) | 0, undefined);
          const _bind$8 = _a.ids;
          const _bind$9 = _bind$8.len;
          const _bind$10 = _bind$8.buf;
          let _tmp$5 = 0;
          while (true) {
            const _ = _tmp$5;
            if (_ < _bind$9) {
              const c = _bind$10[_];
              if (c >>> 0 < occupied.length) {
                occupied[c] = -1;
              } else {
                $oob();
              }
              _tmp$5 = _ + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if (bs === undefined) {
            continue;
          } else {
            const _Some$2 = bs;
            const _bb = _Some$2;
            let _tmp$6;
            const _p$3 = _M0MPC15array5Array4iterGiE(_a.ray);
            let _tmp$7;
            while (true) {
              const _p$4 = _M0MPB4Iter4nextGiE(_p$3);
              if (_p$4 === undefined) {
                _tmp$7 = false;
                break;
              } else {
                const _p$5 = _p$4;
                const _p$6 = _p$5;
                if (_M0FP310monkeyfist2mf4core8contains(_bb.ids, _p$6)) {
                  _tmp$7 = true;
                  break;
                }
                continue;
              }
            }
            if (!_tmp$7) {
              _tmp$6 = true;
            } else {
              const _p$4 = _M0MPC15array5Array4iterGiE(_bb.ray);
              let _tmp$8;
              while (true) {
                const _p$5 = _M0MPB4Iter4nextGiE(_p$4);
                if (_p$5 === undefined) {
                  _tmp$8 = false;
                  break;
                } else {
                  const _p$6 = _p$5;
                  const _p$7 = _p$6;
                  if (_M0FP310monkeyfist2mf4core8contains(_a.ids, _p$7)) {
                    _tmp$8 = true;
                    break;
                  }
                  continue;
                }
              }
              _tmp$6 = !_tmp$8;
            }
            if (_tmp$6) {
              continue;
            }
            const i = ropes.len;
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(ropes, _a.path);
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(ropes, _bb.path);
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(stops, new _M0TPB5ArrayGiE([], 0));
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(stops, new _M0TPB5ArrayGiE([], 0));
            const board = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, _M0FP310monkeyfist2mf4core11some__paths(ropes));
            let trial = undefined;
            let _bind_buf = [i, i + 1 | 0];
            let _bind_len = 2;
            const _bind$11 = _bind_len;
            const _bind$12 = _bind_buf;
            let _tmp$8 = 0;
            while (true) {
              const _ = _tmp$8;
              if (_ < _bind$11) {
                const id = _bind$12[_];
                _L: {
                  const target = _M0MP310monkeyfist2mf4core8HexBoard2to(board, id);
                  if (target <= 0) {
                    break _L;
                  }
                  const _bind$13 = board.tracks;
                  if (id < 0 || id >= _bind$13.len) {
                    $panic();
                  }
                  const _tmp$9 = _bind$13.buf[id];
                  const _tmp$10 = board.lengths;
                  const _tmp$11 = (target + (id >>> 0 < _tmp$10.length ? _tmp$10[id] : $oob()) | 0) - 1 | 0;
                  const _bind$14 = new _M0TPB5ArrayGiE([_tmp$11 >>> 0 < _tmp$9.length ? _tmp$9[_tmp$11] : $oob()], 1);
                  if (id < 0 || id >= stops.len) {
                    $panic();
                  }
                  stops.buf[id] = _bind$14;
                  trial = _M0FP310monkeyfist2mf4core10hex__buildN6intentS5045(_env$2, undefined);
                  const _bind$15 = trial;
                  if (_bind$15 === undefined) {
                  } else {
                    break;
                  }
                  const _bind$16 = new _M0TPB5ArrayGiE([], 0);
                  if (id < 0 || id >= stops.len) {
                    $panic();
                  }
                  stops.buf[id] = _bind$16;
                  break _L;
                }
                _tmp$8 = _ + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            const _bind$13 = trial;
            if (_bind$13 === undefined) {
              _M0MPC15array5Array3popGAiE(ropes);
              _M0MPC15array5Array3popGAiE(ropes);
              _M0MPC15array5Array3popGAiE(stops);
              _M0MPC15array5Array3popGAiE(stops);
              continue;
            } else {
              const _Some$3 = _bind$13;
              const _t = _Some$3;
              result = _t;
              knots = knots + 1 | 0;
              const _bind$14 = _a.ids;
              const _bind$15 = _bind$14.len;
              const _bind$16 = _bind$14.buf;
              let _tmp$9 = 0;
              while (true) {
                const _ = _tmp$9;
                if (_ < _bind$15) {
                  const c = _bind$16[_];
                  if (c >>> 0 < occupied.length) {
                    occupied[c] = i;
                  } else {
                    $oob();
                  }
                  _tmp$9 = _ + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              const _bind$17 = _bb.ids;
              const _bind$18 = _bind$17.len;
              const _bind$19 = _bind$17.buf;
              let _tmp$10 = 0;
              while (true) {
                const _ = _tmp$10;
                if (_ < _bind$18) {
                  const c = _bind$19[_];
                  if (c >>> 0 < occupied.length) {
                    occupied[c] = i + 1 | 0;
                  } else {
                    $oob();
                  }
                  _tmp$10 = _ + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              covered = covered + (_a.ids.len + _bb.ids.len | 0) | 0;
            }
          }
        }
        continue;
      } else {
        break;
      }
    }
    let attempts = 0;
    const turned_by = $make_array_len_and_init(area, false);
    const turned_count = new _M0TPB8MutLocalGiE(0);
    const _env$4 = { _0: w, _1: turned_count, _2: bent, _3: turned_by, _4: h };
    const _bind$4 = ropes.len;
    const _bind$5 = ropes.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$4) {
        const path = _bind$5[_];
        _M0FP310monkeyfist2mf4core10hex__buildN11note__turnsS5047(_env$4, path);
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let traps = 0;
    const limit = Math.imul(area, 22) | 0;
    while (true) {
      if (covered + 0 < (area + 0) * cfg.coverage && attempts < limit) {
        let _tmp$3;
        if (traps < cfg.traps) {
          let _tmp$4;
          if (ropes.len >= 2) {
            let _tmp$5;
            if (_M0MP310monkeyfist2mf4core3Rng4next(rng) < 0.5) {
              let _tmp$6;
              let _return_value;
              _L: {
                _L$2: {
                  const board = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, _M0FP310monkeyfist2mf4core11some__paths(ropes));
                  const _p = ropes.len;
                  let way_out;
                  if (_p <= 0) {
                    way_out = new _M0TPB5ArrayGAbE([], 0);
                  } else {
                    const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p);
                    let _tmp$7 = 0;
                    while (true) {
                      const _p$3 = _tmp$7;
                      if (_p$3 < _p) {
                        const _p$4 = $make_array_len_and_init(area, false);
                        const _p$5 = board.tracks;
                        if (_p$3 < 0 || _p$3 >= _p$5.len) {
                          $panic();
                        }
                        const _p$6 = _p$5.buf[_p$3];
                        const _tmp$8 = board.lengths;
                        const _p$7 = _p$3 >>> 0 < _tmp$8.length ? _tmp$8[_p$3] : $oob();
                        const _p$8 = _p$6.length;
                        let _tmp$9 = _p$7;
                        while (true) {
                          const _p$9 = _tmp$9;
                          if (_p$9 < _p$8) {
                            const _tmp$10 = _p$9 >>> 0 < _p$6.length ? _p$6[_p$9] : $oob();
                            if (_tmp$10 >>> 0 < _p$4.length) {
                              _p$4[_tmp$10] = true;
                            } else {
                              $oob();
                            }
                            _tmp$9 = _p$9 + 1 | 0;
                            continue;
                          } else {
                            break;
                          }
                        }
                        const _p$9 = _p$4;
                        _p$2.buf[_p$3] = _p$9;
                        _tmp$7 = _p$3 + 1 | 0;
                        continue;
                      } else {
                        break;
                      }
                    }
                    way_out = _p$2;
                  }
                  const spots = new _M0TPB5ArrayGUiiiRPB5ArrayGiEEE([], 0);
                  const deadly = new _M0TPB5ArrayGUiiiRPB5ArrayGiEEE([], 0);
                  let _tmp$7 = 0;
                  while (true) {
                    const c = _tmp$7;
                    if (c < area) {
                      _L$3: {
                        if (!_M0FP310monkeyfist2mf4core10hex__buildN4freeS5044(_env, c)) {
                          break _L$3;
                        }
                        let _tmp$8 = 0;
                        while (true) {
                          const d = _tmp$8;
                          if (d < 6) {
                            _L$4: {
                              if (c < 0 || c >= neighbours.len) {
                                $panic();
                              }
                              const _tmp$9 = neighbours.buf[c];
                              const _tmp$10 = (d + 3 | 0) % 6 | 0;
                              if (!_M0FP310monkeyfist2mf4core10hex__buildN4freeS5044(_env, _tmp$10 >>> 0 < _tmp$9.length ? _tmp$9[_tmp$10] : $oob())) {
                                break _L$4;
                              }
                              const out = new _M0TPB5ArrayGiE([], 0);
                              let _bind$6;
                              if (bent.keys.len > 0) {
                                _bind$6 = _M0FP310monkeyfist2mf4core10ray__track(w, h, c, d, bent, out, undefined) ? out : undefined;
                              } else {
                                if (c < 0 || c >= neighbours.len) {
                                  $panic();
                                }
                                const _tmp$11 = neighbours.buf[c];
                                let c$2 = d >>> 0 < _tmp$11.length ? _tmp$11[d] : $oob();
                                while (true) {
                                  if (c$2 >= 0) {
                                    _M0MPC15array5Array4pushGiE(out, c$2);
                                    const _bind$7 = c$2;
                                    if (_bind$7 < 0 || _bind$7 >= neighbours.len) {
                                      $panic();
                                    }
                                    const _tmp$12 = neighbours.buf[_bind$7];
                                    c$2 = d >>> 0 < _tmp$12.length ? _tmp$12[d] : $oob();
                                    continue;
                                  } else {
                                    break;
                                  }
                                }
                                _bind$6 = out;
                              }
                              if (_bind$6 === undefined) {
                                break _L$4;
                              } else {
                                const _Some = _bind$6;
                                const _ahead = _Some;
                                let gap = 0;
                                while (true) {
                                  let _tmp$11;
                                  if (gap < _ahead.len) {
                                    let _tmp$12;
                                    if (gap < 4) {
                                      const _bind$7 = gap;
                                      if (_bind$7 < 0 || _bind$7 >= _ahead.len) {
                                        $panic();
                                      }
                                      const _tmp$13 = _ahead.buf[_bind$7];
                                      _tmp$12 = (_tmp$13 >>> 0 < occupied.length ? occupied[_tmp$13] : $oob()) < 0;
                                    } else {
                                      _tmp$12 = false;
                                    }
                                    _tmp$11 = _tmp$12;
                                  } else {
                                    _tmp$11 = false;
                                  }
                                  if (_tmp$11) {
                                    gap = gap + 1 | 0;
                                    continue;
                                  } else {
                                    break;
                                  }
                                }
                                let _tmp$11;
                                if (gap >= 1) {
                                  let _tmp$12;
                                  if (gap <= 3) {
                                    let _tmp$13;
                                    if (gap < _ahead.len) {
                                      const _bind$7 = gap;
                                      if (_bind$7 < 0 || _bind$7 >= _ahead.len) {
                                        $panic();
                                      }
                                      const _tmp$14 = _ahead.buf[_bind$7];
                                      _tmp$13 = (_tmp$14 >>> 0 < occupied.length ? occupied[_tmp$14] : $oob()) >= 0;
                                    } else {
                                      _tmp$13 = false;
                                    }
                                    _tmp$12 = _tmp$13;
                                  } else {
                                    _tmp$12 = false;
                                  }
                                  _tmp$11 = _tmp$12;
                                } else {
                                  _tmp$11 = false;
                                }
                                if (_tmp$11) {
                                  let ok = true;
                                  const _bind$7 = gap;
                                  let _tmp$12 = 0;
                                  while (true) {
                                    const k = _tmp$12;
                                    if (k < _bind$7) {
                                      if (k < 0 || k >= _ahead.len) {
                                        $panic();
                                      }
                                      const _tmp$13 = _ahead.buf[k];
                                      if (_tmp$13 >>> 0 < kept.length ? kept[_tmp$13] : $oob()) {
                                        ok = false;
                                      }
                                      _tmp$12 = k + 1 | 0;
                                      continue;
                                    } else {
                                      break;
                                    }
                                  }
                                  if (!ok) {
                                    break _L$4;
                                  }
                                  const cells = _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(_ahead, 0, gap));
                                  const spot = { _0: c, _1: d, _2: gap, _3: cells };
                                  const _bind$8 = gap;
                                  if (_bind$8 < 0 || _bind$8 >= _ahead.len) {
                                    $panic();
                                  }
                                  const _tmp$13 = _ahead.buf[_bind$8];
                                  const blocker = _tmp$13 >>> 0 < occupied.length ? occupied[_tmp$13] : $oob();
                                  _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(spots, spot);
                                  if (blocker < way_out.len) {
                                    if (blocker < 0 || blocker >= way_out.len) {
                                      $panic();
                                    }
                                    const wo = way_out.buf[blocker];
                                    let _tmp$14;
                                    if (c >>> 0 < wo.length ? wo[c] : $oob()) {
                                      _tmp$14 = true;
                                    } else {
                                      const _p$2 = _M0MPC15array5Array4iterGiE(cells);
                                      let _tmp$15;
                                      while (true) {
                                        const _p$3 = _M0MPB4Iter4nextGiE(_p$2);
                                        if (_p$3 === undefined) {
                                          _tmp$15 = false;
                                          break;
                                        } else {
                                          const _p$4 = _p$3;
                                          const _p$5 = _p$4;
                                          if (_p$5 >>> 0 < wo.length ? wo[_p$5] : $oob()) {
                                            _tmp$15 = true;
                                            break;
                                          }
                                          continue;
                                        }
                                      }
                                      _tmp$14 = _tmp$15;
                                    }
                                    if (_tmp$14) {
                                      _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(deadly, spot);
                                    }
                                  }
                                }
                              }
                              break _L$4;
                            }
                            _tmp$8 = d + 1 | 0;
                            continue;
                          } else {
                            break;
                          }
                        }
                        break _L$3;
                      }
                      _tmp$7 = c + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  const pool = deadly.len > 0 ? deadly : spots;
                  let _tmp$8 = 0;
                  while (true) {
                    const _ = _tmp$8;
                    if (_ < 16) {
                      _L$3: {
                        if (pool.len === 0) {
                          break;
                        }
                        const _bind$6 = _M0MP310monkeyfist2mf4core3Rng5below(rng, pool.len);
                        if (_bind$6 < 0 || _bind$6 >= pool.len) {
                          $panic();
                        }
                        const _bind$7 = pool.buf[_bind$6];
                        const _sc = _bind$7._0;
                        const _sd = _bind$7._1;
                        const _sgap = _bind$7._2;
                        const _scells = _bind$7._3;
                        const _tmp$9 = _M0MP310monkeyfist2mf4core3Rng4next(rng);
                        const _p$2 = (cfg.length + 0) / 2;
                        const want = 3 + _M0MPC16double6Double7to__int(_M0MPC16double6Double5floor(_tmp$9 * (2 > _p$2 ? 2 : _p$2))) | 0;
                        const _bind$8 = _M0FP310monkeyfist2mf4core10hex__buildN5shapeS5046(_env$3, want, { _0: _sc, _1: _sd });
                        if (_bind$8 === undefined) {
                          break _L$3;
                        } else {
                          const _Some = _bind$8;
                          const _shaped = _Some;
                          const id = ropes.len;
                          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(ropes, _shaped.path);
                          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(stops, new _M0TPB5ArrayGiE([], 0));
                          const trial = _M0FP310monkeyfist2mf4core10hex__buildN6intentS5045(_env$2, undefined);
                          let fatal = false;
                          if (trial === undefined) {
                          } else {
                            const board$2 = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, h, mirrors, _M0FP310monkeyfist2mf4core11some__paths(ropes));
                            if (_M0MP310monkeyfist2mf4core8HexBoard2to(board$2, id) === _sgap) {
                              _M0MP310monkeyfist2mf4core8HexBoard5place(board$2, id, _sgap);
                              fatal = _M0MP310monkeyfist2mf4core8HexBoard4dead(board$2);
                            }
                          }
                          if (!fatal) {
                            _M0MPC15array5Array3popGAiE(ropes);
                            _M0MPC15array5Array3popGAiE(stops);
                            break _L$3;
                          }
                          let _tmp$10;
                          if (trial === undefined) {
                            _tmp$10 = $panic();
                          } else {
                            const _p$3 = trial;
                            _tmp$10 = _p$3;
                          }
                          result = _tmp$10;
                          _M0FP310monkeyfist2mf4core10hex__buildN11note__turnsS5047(_env$4, _shaped.path);
                          const _bind$9 = _shaped.ids;
                          const _bind$10 = _bind$9.len;
                          const _bind$11 = _bind$9.buf;
                          let _tmp$11 = 0;
                          while (true) {
                            const _$2 = _tmp$11;
                            if (_$2 < _bind$10) {
                              const c = _bind$11[_$2];
                              if (c >>> 0 < occupied.length) {
                                occupied[c] = id;
                              } else {
                                $oob();
                              }
                              _tmp$11 = _$2 + 1 | 0;
                              continue;
                            } else {
                              break;
                            }
                          }
                          covered = covered + _shaped.ids.len | 0;
                          const _bind$12 = _scells.len;
                          const _bind$13 = _scells.buf;
                          let _tmp$12 = 0;
                          while (true) {
                            const _$2 = _tmp$12;
                            if (_$2 < _bind$12) {
                              const x = _bind$13[_$2];
                              if (x >>> 0 < kept.length) {
                                kept[x] = true;
                              } else {
                                $oob();
                              }
                              _tmp$12 = _$2 + 1 | 0;
                              continue;
                            } else {
                              break;
                            }
                          }
                          traps = traps + 1 | 0;
                          _return_value = true;
                          break _L$2;
                        }
                      }
                      _tmp$8 = _ + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  _tmp$6 = false;
                  break _L;
                }
                _tmp$6 = _return_value;
              }
              _tmp$5 = _tmp$6;
            } else {
              _tmp$5 = false;
            }
            _tmp$4 = _tmp$5;
          } else {
            _tmp$4 = false;
          }
          _tmp$3 = _tmp$4;
        } else {
          _tmp$3 = false;
        }
        if (_tmp$3) {
          continue;
        }
        let best = undefined;
        const aim = bent.keys.len > turned_count.val;
        let n = 0;
        while (true) {
          if (n < 12) {
            const old = attempts;
            attempts = attempts + 1 | 0;
            if (!(old < limit)) {
              break;
            }
            const want = 4 + _M0MPC16double6Double7to__int(_M0MPC16double6Double5floor((0.45 + 0.55 * _M0MP310monkeyfist2mf4core3Rng4next(rng)) * (cfg.length + 0))) | 0;
            let aim_spot;
            if (aim && n < 4) {
              let _return_value;
              _L: {
                _L$2: {
                  const _p = new _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE([], 0);
                  const _p$2 = mirrors.len;
                  const _p$3 = mirrors.buf;
                  let idle;
                  let _tmp$4 = 0;
                  while (true) {
                    const _p$4 = _tmp$4;
                    if (_p$4 < _p$2) {
                      const _p$5 = _p$3[_p$4];
                      const _tmp$5 = _M0FP310monkeyfist2mf4core9hex__cell(_p$5.cell, w);
                      if (!(_tmp$5 >>> 0 < turned_by.length ? turned_by[_tmp$5] : $oob())) {
                        _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(_p, _p$5);
                      }
                      _tmp$4 = _p$4 + 1 | 0;
                      continue;
                    } else {
                      idle = _p;
                      break;
                    }
                  }
                  if (idle.len === 0) {
                    _return_value = undefined;
                    break _L$2;
                  }
                  const _bind$6 = _M0MP310monkeyfist2mf4core3Rng5below(rng, idle.len);
                  if (_bind$6 < 0 || _bind$6 >= idle.len) {
                    $panic();
                  }
                  const m = idle.buf[_bind$6];
                  const c = _M0FP310monkeyfist2mf4core9hex__cell(m.cell, w);
                  const _p$4 = new _M0TPB5ArrayGiE([0, 1, 2, 3, 4, 5], 6);
                  const _p$5 = new _M0TPB5ArrayGiE([], 0);
                  const _p$6 = _p$4.len;
                  const _p$7 = _p$4.buf;
                  let dirs;
                  let _tmp$5 = 0;
                  while (true) {
                    const _p$8 = _tmp$5;
                    if (_p$8 < _p$6) {
                      const _p$9 = _p$7[_p$8];
                      if ((_p$9 % 3 | 0) !== (m.kind % 3 | 0)) {
                        _M0MPC15array5Array4pushGiE(_p$5, _p$9);
                      }
                      _tmp$5 = _p$8 + 1 | 0;
                      continue;
                    } else {
                      dirs = _p$5;
                      break;
                    }
                  }
                  const _bind$7 = _M0MP310monkeyfist2mf4core3Rng5below(rng, dirs.len);
                  if (_bind$7 < 0 || _bind$7 >= dirs.len) {
                    $panic();
                  }
                  const d = dirs.buf[_bind$7];
                  const j = 1 + _M0MP310monkeyfist2mf4core3Rng5below(rng, 3) | 0;
                  let head = c;
                  let k = 0;
                  while (true) {
                    if (k < j && head >= 0) {
                      const _bind$8 = head;
                      if (_bind$8 < 0 || _bind$8 >= neighbours.len) {
                        $panic();
                      }
                      const _tmp$6 = neighbours.buf[_bind$8];
                      const _tmp$7 = (d + 3 | 0) % 6 | 0;
                      head = _tmp$7 >>> 0 < _tmp$6.length ? _tmp$6[_tmp$7] : $oob();
                      k = k + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  let x = head;
                  k = 0;
                  while (true) {
                    if (k < j && x >= 0) {
                      if (!_M0FP310monkeyfist2mf4core10hex__buildN4freeS5044(_env, x)) {
                        _return_value = undefined;
                        break _L$2;
                      }
                      k = k + 1 | 0;
                      const _bind$8 = x;
                      if (_bind$8 < 0 || _bind$8 >= neighbours.len) {
                        $panic();
                      }
                      const _tmp$6 = neighbours.buf[_bind$8];
                      x = d >>> 0 < _tmp$6.length ? _tmp$6[d] : $oob();
                      continue;
                    } else {
                      break;
                    }
                  }
                  aim_spot = head >= 0 ? { _0: head, _1: d } : undefined;
                  break _L;
                }
                aim_spot = _return_value;
              }
            } else {
              aim_spot = undefined;
            }
            n = n + 1 | 0;
            const _bind$6 = _M0FP310monkeyfist2mf4core10hex__buildN5shapeS5046(_env$3, want, aim_spot);
            if (_bind$6 === undefined) {
              continue;
            } else {
              const _Some = _bind$6;
              const _s = _Some;
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(ropes, _s.path);
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(stops, new _M0TPB5ArrayGiE([], 0));
              const trial = _M0FP310monkeyfist2mf4core10hex__buildN6intentS5045(_env$2, undefined);
              _M0MPC15array5Array3popGAiE(ropes);
              _M0MPC15array5Array3popGAiE(stops);
              if (trial === undefined) {
                continue;
              } else {
                const _Some$2 = trial;
                const _t = _Some$2;
                let fresh = 0;
                const _bind$7 = _s.turns;
                const _bind$8 = _bind$7.len;
                const _bind$9 = _bind$7.buf;
                let _tmp$4 = 0;
                while (true) {
                  const _ = _tmp$4;
                  if (_ < _bind$8) {
                    const c = _bind$9[_];
                    if (!(c >>> 0 < turned_by.length ? turned_by[c] : $oob())) {
                      fresh = fresh + 1 | 0;
                    }
                    _tmp$4 = _ + 1 | 0;
                    continue;
                  } else {
                    break;
                  }
                }
                const gain = ((_t.cost - result.cost | 0) + 0) * (cfg.tap_depth - 1) + ((Math.imul(_s.ids.len, 4) | 0) + 0) + ((Math.imul(30, fresh) | 0) + 0);
                _L: {
                  _L$2: {
                    const _bind$10 = best;
                    if (_bind$10 === undefined) {
                      break _L$2;
                    } else {
                      const _Some$3 = _bind$10;
                      const _x = _Some$3;
                      const _g = _x._2;
                      if (!(gain > _g)) {
                      } else {
                        break _L$2;
                      }
                    }
                    break _L;
                  }
                  best = { _0: _s, _1: _t, _2: gain };
                }
              }
            }
            continue;
          } else {
            break;
          }
        }
        const _bind$6 = best;
        if (_bind$6 === undefined) {
          continue;
        } else {
          const _Some = _bind$6;
          const _x = _Some;
          const _s = _x._0;
          const _t = _x._1;
          const id = ropes.len;
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(ropes, _s.path);
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(stops, new _M0TPB5ArrayGiE([], 0));
          result = _t;
          _M0FP310monkeyfist2mf4core10hex__buildN11note__turnsS5047(_env$4, _s.path);
          const _bind$7 = _s.ids;
          const _bind$8 = _bind$7.len;
          const _bind$9 = _bind$7.buf;
          let _tmp$4 = 0;
          while (true) {
            const _ = _tmp$4;
            if (_ < _bind$8) {
              const c = _bind$9[_];
              if (c >>> 0 < occupied.length) {
                occupied[c] = id;
              } else {
                $oob();
              }
              _tmp$4 = _ + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          covered = covered + _s.ids.len | 0;
        }
        continue;
      } else {
        break;
      }
    }
    const _bind$6 = _M0FP310monkeyfist2mf4core10hex__buildN6intentS5045(_env$2, result.moves);
    if (_bind$6 === undefined) {
      $panic("Hex weaving certificate failed");
    }
    return new _M0TP310monkeyfist2mf4core8HexBuilt(ropes, result.moves);
  }
  function _M0FP310monkeyfist2mf4core8coverage(b) {
    let sum = 0;
    const _bind = b.ropes;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const p = _bind$3[_];
        sum = sum + p.len | 0;
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return (sum + 0) / ((((Math.imul(b.w, b.h) | 0) - b.mirrors.len | 0) - b.springs.len | 0) + 0);
  }
  function _M0FP310monkeyfist2mf4core8adjacent(a, b, hex) {
    const dq = b.q - a.q | 0;
    const dr = b.r - a.r | 0;
    return hex ? _M0FP310monkeyfist2mf4core15hex__dir__index(dq, dr) >= 0 : dq === 0 && (dr === 1 || dr === -1) || dr === 0 && (dq === 1 || dq === -1);
  }
  function _M0FP310monkeyfist2mf4core5valid(b, g) {
    const used = $make_array_len_and_init(Math.imul(b.w, b.h) | 0, false);
    const _bind = b.springs;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const p = _bind$3[_];
        const _tmp$2 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
        if (_tmp$2 >>> 0 < used.length) {
          used[_tmp$2] = true;
        } else {
          $oob();
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$4 = b.mirrors;
    const _bind$5 = _bind$4.len;
    const _bind$6 = _bind$4.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$5) {
        const m = _bind$6[_];
        const _tmp$3 = _M0MP310monkeyfist2mf4core3Geo4cell(g, m.cell);
        if (_tmp$3 >>> 0 < used.length) {
          used[_tmp$3] = true;
        } else {
          $oob();
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$7 = b.ropes;
    const _bind$8 = _bind$7.len;
    const _bind$9 = _bind$7.buf;
    let _tmp$3 = 0;
    while (true) {
      const _ = _tmp$3;
      if (_ < _bind$8) {
        const path = _bind$9[_];
        if (path.len < 2) {
          return false;
        }
        const _bind$10 = path.len;
        const _bind$11 = path.buf;
        let _tmp$4 = 0;
        while (true) {
          const i = _tmp$4;
          if (i < _bind$10) {
            const p = _bind$11[i];
            let _tmp$5;
            if (!_M0MP310monkeyfist2mf4core3Geo6inside(g, p)) {
              _tmp$5 = true;
            } else {
              const _tmp$6 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
              _tmp$5 = _tmp$6 >>> 0 < used.length ? used[_tmp$6] : $oob();
            }
            if (_tmp$5) {
              return false;
            }
            let _tmp$6;
            if (i > 0) {
              const _bind$12 = i - 1 | 0;
              if (_bind$12 < 0 || _bind$12 >= path.len) {
                $panic();
              }
              _tmp$6 = !_M0FP310monkeyfist2mf4core8adjacent(path.buf[_bind$12], p, b.hex);
            } else {
              _tmp$6 = false;
            }
            if (_tmp$6) {
              return false;
            }
            const _tmp$7 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
            if (_tmp$7 >>> 0 < used.length) {
              used[_tmp$7] = true;
            } else {
              $oob();
            }
            _tmp$4 = i + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp$3 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return true;
  }
  function _M0FP310monkeyfist2mf4core14repeated__core(hex, w, height, d, rng) {
    const options = new _M0TPB5ArrayGRPB5ArrayGRPB5ArrayGRP310monkeyfist2mf4core2PtEEE([], 0);
    const _p = (w < height ? w : height) / 2 | 0;
    const _p$2 = 10 < _p ? 10 : _p;
    const _p$3 = (w > height ? w : height) - 4 | 0;
    const maximum = _p$2 < _p$3 ? _p$2 : _p$3;
    const _p$4 = (d - 60) / 40;
    const _p$5 = 1 < _p$4 ? 1 : _p$4;
    const wanted = _M0FP310monkeyfist2mf4core9js__round(3 + (0 > _p$5 ? 0 : _p$5) * ((maximum - 3 | 0) + 0));
    let depth = maximum < wanted ? maximum : wanted;
    while (true) {
      if (depth >= 3) {
        const roomy = (w < height ? w : height) >= 10;
        const extra = roomy ? _M0MP310monkeyfist2mf4core3Rng5below(rng, 3) : 0;
        const bottom = roomy ? 2 + _M0MP310monkeyfist2mf4core3Rng5below(rng, 3) | 0 : 2;
        const side = roomy ? 1 + _M0MP310monkeyfist2mf4core3Rng5below(rng, 2) | 0 : 1;
        const a = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
        const b = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
        const left = ((-depth | 0) - 3 | 0) - extra | 0;
        const _bind = depth;
        let _tmp = 1;
        let _tmp$2 = 1 <= _bind;
        while (true) {
          const r = _tmp;
          const _more = _tmp$2;
          if (_more) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(a, new _M0TP310monkeyfist2mf4core2Pt(0, r));
            _tmp = r + 1 | 0;
            _tmp$2 = r < _bind;
            continue;
          } else {
            break;
          }
        }
        let _tmp$3 = -1;
        while (true) {
          const q = _tmp$3;
          if (q >= left) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(a, new _M0TP310monkeyfist2mf4core2Pt(q, depth));
            _tmp$3 = q - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let column = left;
        let _tmp$4 = depth - 1 | 0;
        while (true) {
          const r = _tmp$4;
          if (r >= 0) {
            const next = extra > 0 && (r > 0 && (r % 3 | 0) === 1) ? left - 1 | 0 : left;
            if (next !== column) {
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(a, new _M0TP310monkeyfist2mf4core2Pt(next, r + 1 | 0));
            }
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(a, new _M0TP310monkeyfist2mf4core2Pt(next, r));
            column = next;
            _tmp$4 = r - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let _tmp$5 = left + 1 | 0;
        while (true) {
          const q = _tmp$5;
          if (q <= ((-depth | 0) - 2 | 0)) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(a, new _M0TP310monkeyfist2mf4core2Pt(q, 0));
            _tmp$5 = q + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let _tmp$6 = -depth | 0;
        while (true) {
          const q = _tmp$6;
          if (q <= -1) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(b, new _M0TP310monkeyfist2mf4core2Pt(q, 0));
            _tmp$6 = q + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let _tmp$7 = -1;
        while (true) {
          const q = _tmp$7;
          if (q >= (-side | 0)) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(b, new _M0TP310monkeyfist2mf4core2Pt(q, -1));
            _tmp$7 = q - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let _tmp$8 = -2;
        while (true) {
          const r = _tmp$8;
          if (r >= (-bottom | 0)) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(b, new _M0TP310monkeyfist2mf4core2Pt(-side | 0, r));
            _tmp$8 = r - 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let _tmp$9 = 1 - side | 0;
        while (true) {
          const q = _tmp$9;
          if (q <= 0) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(b, new _M0TP310monkeyfist2mf4core2Pt(q, -bottom | 0));
            _tmp$9 = q + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        let _tmp$10 = 1 - bottom | 0;
        while (true) {
          const r = _tmp$10;
          if (r <= -1) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(b, new _M0TP310monkeyfist2mf4core2Pt(0, r));
            _tmp$10 = r + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const _bind$2 = hex ? 6 : 4;
        let _tmp$11 = 0;
        while (true) {
          const turn = _tmp$11;
          if (turn < _bind$2) {
            let _bind_buf = [false, true];
            let _bind_len = 2;
            const _bind$3 = _bind_len;
            const _bind$4 = _bind_buf;
            let _tmp$12 = 0;
            while (true) {
              const _ = _tmp$12;
              if (_ < _bind$3) {
                const flip = _bind$4[_];
                _L: {
                  const _p$6 = new _M0TPB5ArrayGRPB5ArrayGRP310monkeyfist2mf4core2PtEE([a, b], 2);
                  const _p$7 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p$6.len);
                  const _p$8 = _p$6.len;
                  const _p$9 = _p$6.buf;
                  let _tmp$13 = 0;
                  while (true) {
                    const _p$10 = _tmp$13;
                    if (_p$10 < _p$8) {
                      const _p$11 = _p$9[_p$10];
                      const _p$12 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p$11.len);
                      const _p$13 = _p$11.len;
                      const _p$14 = _p$11.buf;
                      let _tmp$14 = 0;
                      while (true) {
                        const _p$15 = _tmp$14;
                        if (_p$15 < _p$13) {
                          const _p$16 = _p$14[_p$15];
                          let _p$17 = _p$16.q;
                          let _p$18 = _p$16.r;
                          if (flip) {
                            const _p$19 = _p$17;
                            _p$17 = _p$18;
                            _p$18 = _p$19;
                          }
                          let _tmp$15 = 0;
                          while (true) {
                            const _p$19 = _tmp$15;
                            if (_p$19 < turn) {
                              const _p$20 = _p$17;
                              if (hex) {
                                _p$17 = -_p$18 | 0;
                                _p$18 = _p$20 + _p$18 | 0;
                              } else {
                                _p$17 = -_p$18 | 0;
                                _p$18 = _p$20;
                              }
                              _tmp$15 = _p$19 + 1 | 0;
                              continue;
                            } else {
                              break;
                            }
                          }
                          const _p$19 = new _M0TP310monkeyfist2mf4core2Pt(_p$17, _p$18);
                          _p$12.buf[_p$15] = _p$19;
                          _tmp$14 = _p$15 + 1 | 0;
                          continue;
                        } else {
                          break;
                        }
                      }
                      const _p$15 = _p$12;
                      _p$7.buf[_p$10] = _p$15;
                      _tmp$13 = _p$10 + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  const ropes = _p$7;
                  const r0 = new _M0TPB8MutLocalGiE(1000000);
                  let r1 = -1000000;
                  const _bind$5 = ropes.len;
                  const _bind$6 = ropes.buf;
                  let _tmp$14 = 0;
                  while (true) {
                    const _$2 = _tmp$14;
                    if (_$2 < _bind$5) {
                      const path = _bind$6[_$2];
                      const _bind$7 = path.len;
                      const _bind$8 = path.buf;
                      let _tmp$15 = 0;
                      while (true) {
                        const _$3 = _tmp$15;
                        if (_$3 < _bind$7) {
                          const p = _bind$8[_$3];
                          const _p$10 = r0.val;
                          const _p$11 = p.r;
                          r0.val = _p$10 < _p$11 ? _p$10 : _p$11;
                          const _p$12 = r1;
                          const _p$13 = p.r;
                          r1 = _p$12 > _p$13 ? _p$12 : _p$13;
                          _tmp$15 = _$3 + 1 | 0;
                          continue;
                        } else {
                          break;
                        }
                      }
                      _tmp$14 = _$2 + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  const rows = (r1 - r0.val | 0) + 1 | 0;
                  if (rows > height) {
                    break _L;
                  }
                  const row = _M0MP310monkeyfist2mf4core3Rng5below(rng, (height - rows | 0) + 1 | 0);
                  const x0 = new _M0TPB8MutLocalGiE(1000000);
                  let x1 = -1000000;
                  const _bind$7 = ropes.len;
                  const _bind$8 = ropes.buf;
                  let _tmp$15 = 0;
                  while (true) {
                    const _$2 = _tmp$15;
                    if (_$2 < _bind$7) {
                      const path = _bind$8[_$2];
                      const _bind$9 = path.len;
                      const _bind$10 = path.buf;
                      let _tmp$16 = 0;
                      while (true) {
                        const _$3 = _tmp$16;
                        if (_$3 < _bind$9) {
                          const p = _bind$10[_$3];
                          const c = p.q + (hex ? _M0FP310monkeyfist2mf4core10floor__div((p.r - r0.val | 0) + row | 0, 2) : 0) | 0;
                          const _p$10 = x0.val;
                          x0.val = _p$10 < c ? _p$10 : c;
                          const _p$11 = x1;
                          x1 = _p$11 > c ? _p$11 : c;
                          _tmp$16 = _$3 + 1 | 0;
                          continue;
                        } else {
                          break;
                        }
                      }
                      _tmp$15 = _$2 + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  const width = (x1 - x0.val | 0) + 1 | 0;
                  if (width > w) {
                    break _L;
                  }
                  const col = _M0MP310monkeyfist2mf4core3Rng5below(rng, (w - width | 0) + 1 | 0);
                  const _p$10 = _M0MPC15array5Array20unsafe__make__uninitGAiE(ropes.len);
                  const _p$11 = ropes.len;
                  const _p$12 = ropes.buf;
                  let _tmp$16 = 0;
                  while (true) {
                    const _p$13 = _tmp$16;
                    if (_p$13 < _p$11) {
                      const _p$14 = _p$12[_p$13];
                      const _p$15 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p$14.len);
                      const _p$16 = _p$14.len;
                      const _p$17 = _p$14.buf;
                      let _tmp$17 = 0;
                      while (true) {
                        const _p$18 = _tmp$17;
                        if (_p$18 < _p$16) {
                          const _p$19 = _p$17[_p$18];
                          const _p$20 = new _M0TP310monkeyfist2mf4core2Pt((_p$19.q - x0.val | 0) + col | 0, (_p$19.r - r0.val | 0) + row | 0);
                          _p$15.buf[_p$18] = _p$20;
                          _tmp$17 = _p$18 + 1 | 0;
                          continue;
                        } else {
                          break;
                        }
                      }
                      const _p$18 = _p$15;
                      _p$10.buf[_p$13] = _p$18;
                      _tmp$16 = _p$13 + 1 | 0;
                      continue;
                    } else {
                      break;
                    }
                  }
                  _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(options, _p$10);
                  break _L;
                }
                _tmp$12 = _ + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            _tmp$11 = turn + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        if (options.len > 0) {
          break;
        }
        depth = depth - 1 | 0;
        continue;
      } else {
        break;
      }
    }
    if (options.len === 0) {
      return undefined;
    }
    const _bind = _M0MP310monkeyfist2mf4core3Rng5below(rng, options.len);
    if (_bind < 0 || _bind >= options.len) {
      $panic();
    }
    const chosen = options.buf[_bind];
    const board = new _M0TP310monkeyfist2mf4core5Board(hex, w, height, chosen, new _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE([], 0), new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0), new _M0TPB5ArrayGiE([], 0));
    const g = _M0MP310monkeyfist2mf4core5Board3geo(board);
    const solution = _M0MP310monkeyfist2mf4core5Board5solve(board, g, _M0FP310monkeyfist2mf4core11some__paths(chosen), 2000, new _M0TPB5ArrayGiE([], 0));
    if (_M0IP016_24default__implPB2Eq10not__equalGObE(solution.solved, _M0FP310monkeyfist2mf4core14repeated__coreN6constrS5431)) {
      return undefined;
    }
    const proven = _M0MP310monkeyfist2mf4core5Board13minimum__taps(board, g, solution.moves, 20000);
    const _p$6 = _M0MPC15array5Array20unsafe__make__uninitGAiE(chosen.len);
    const _p$7 = chosen.len;
    let _tmp = 0;
    while (true) {
      const _p$8 = _tmp;
      if (_p$8 < _p$7) {
        const _p$9 = new _M0TPB5ArrayGiE([], 0);
        _p$6.buf[_p$8] = _p$9;
        _tmp = _p$8 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const stops = _p$6;
    const offsets = $make_array_len_and_init(chosen.len, 0);
    let paths = _M0FP310monkeyfist2mf4core11some__paths(chosen);
    const _bind$2 = proven.plan;
    const _bind$3 = _bind$2.len;
    const _bind$4 = _bind$2.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$3) {
        const i = _bind$4[_];
        const _bind$5 = _M0MP310monkeyfist2mf4core3Geo3tap(g, paths, i);
        if (_bind$5 === undefined) {
          return undefined;
        } else {
          const _Some = _bind$5;
          const _mv = _Some;
          if (_mv.event === 2) {
            if (i >>> 0 < offsets.length) {
              offsets[i] = (i >>> 0 < offsets.length ? offsets[i] : $oob()) + _mv.distance | 0;
            } else {
              $oob();
            }
            if (i < 0 || i >= stops.len) {
              $panic();
            }
            _M0MPC15array5Array4pushGiE(stops.buf[i], i >>> 0 < offsets.length ? offsets[i] : $oob());
          }
          paths = _mv.paths;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core4Core(chosen, stops, proven.plan);
  }
  function _M0FP310monkeyfist2mf4core14place__mirrorsN5indexS5541(_env, p) {
    const hex = _env._1;
    const w = _env._0;
    return hex ? _M0FP310monkeyfist2mf4core9hex__cell(p, w) : (Math.imul(p.r, w) | 0) + p.q | 0;
  }
  function _M0FP310monkeyfist2mf4core14place__mirrors(hex, w, height, count, rng, avoid) {
    const cells = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
    const _bind = Math.imul(w, height) | 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const p = hex ? _M0FP310monkeyfist2mf4core10hex__point(i, w) : new _M0TP310monkeyfist2mf4core2Pt(i % w | 0, i / w | 0);
        const column = p.q + (hex ? _M0FP310monkeyfist2mf4core10floor__div(p.r, 2) : 0) | 0;
        if (column > 0 && (column < (w - 1 | 0) && (p.r > 0 && (p.r < (height - 1 | 0) && !(i >>> 0 < avoid.length ? avoid[i] : $oob()))))) {
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(cells, p);
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const out = new _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE([], 0);
    const near = $make_array_len_and_init(Math.imul(w, height) | 0, false);
    const _env = { _0: w, _1: hex };
    let tries = 0;
    while (true) {
      if (out.len < count && (cells.len > 0 && tries < (Math.imul(count, 40) | 0))) {
        tries = tries + 1 | 0;
        const _bind$2 = _M0MP310monkeyfist2mf4core3Rng5below(rng, cells.len);
        if (_bind$2 < 0 || _bind$2 >= cells.len) {
          $panic();
        }
        const p = cells.buf[_bind$2];
        const _tmp$2 = _M0FP310monkeyfist2mf4core14place__mirrorsN5indexS5541(_env, p);
        if (_tmp$2 >>> 0 < near.length ? near[_tmp$2] : $oob()) {
          continue;
        }
        if (hex) {
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(out, new _M0TP310monkeyfist2mf4core6Mirror(p, _M0MP310monkeyfist2mf4core3Rng5below(rng, 3)));
        } else {
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(out, new _M0TP310monkeyfist2mf4core6Mirror(p, _M0MP310monkeyfist2mf4core3Rng4next(rng) < 0.5 ? 0 : 1));
        }
        const _tmp$3 = _M0FP310monkeyfist2mf4core14place__mirrorsN5indexS5541(_env, p);
        if (_tmp$3 >>> 0 < near.length) {
          near[_tmp$3] = true;
        } else {
          $oob();
        }
        const _bind$3 = hex ? 6 : 4;
        let _tmp$4 = 0;
        while (true) {
          const d = _tmp$4;
          if (d < _bind$3) {
            const q = hex ? new _M0TP310monkeyfist2mf4core2Pt(p.q + (d >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[d] : $oob()) | 0, p.r + (d >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[d] : $oob()) | 0) : new _M0TP310monkeyfist2mf4core2Pt(p.q + (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dx.length ? _M0FP310monkeyfist2mf4core6sq__dx[d] : $oob()) | 0, p.r + (d >>> 0 < _M0FP310monkeyfist2mf4core6sq__dy.length ? _M0FP310monkeyfist2mf4core6sq__dy[d] : $oob()) | 0);
            const _tmp$5 = _M0FP310monkeyfist2mf4core14place__mirrorsN5indexS5541(_env, q);
            if (_tmp$5 >>> 0 < near.length) {
              near[_tmp$5] = true;
            } else {
              $oob();
            }
            _tmp$4 = d + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        continue;
      } else {
        break;
      }
    }
    return out;
  }
  function _M0FP310monkeyfist2mf4core10knots__for(d) {
    return _M0FP310monkeyfist2mf4core13knots__wanted(300 * _M0FPC14math3pow((0 > d ? 0 : d) / 100, 1.3));
  }
  function _M0FP310monkeyfist2mf4core5woven(hex, w, height, d, rng, style, long_ropes, mirror_count, core_wanted) {
    const area = Math.imul(w, height) | 0;
    const strength = d / 100;
    let length;
    if (long_ropes) {
      length = Math.imul(w < height ? w : height, 2) | 0;
    } else {
      const _p = _M0FP310monkeyfist2mf4core9js__round((Math.imul(w < height ? w : height, 2) | 0) + 0);
      length = 7 > _p ? 7 : _p;
    }
    const core = core_wanted && !long_ropes ? _M0FP310monkeyfist2mf4core14repeated__core(hex, w, height, d, rng) : undefined;
    let mirrors = new _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE([], 0);
    if (mirror_count > 0) {
      const avoid = $make_array_len_and_init(area, false);
      if (core === undefined) {
      } else {
        const _Some = core;
        const _c = _Some;
        let tracks;
        if (hex) {
          tracks = _M0FP310monkeyfist2mf4core17hex__compile__exn(w, height, new _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE([], 0), _M0FP310monkeyfist2mf4core11some__paths(_c.ropes)).tracks;
        } else {
          const _p = _M0FP310monkeyfist2mf4core10sq__tracks(_M0FP310monkeyfist2mf4core11some__paths(_c.ropes), w, height, _M0MP310monkeyfist2mf4core9SqMirrors5empty());
          if (_p === undefined) {
            tracks = $panic();
          } else {
            const _p$2 = _p;
            tracks = _p$2;
          }
        }
        const _bind = tracks.len;
        const _bind$2 = tracks.buf;
        let _tmp = 0;
        while (true) {
          const _ = _tmp;
          if (_ < _bind) {
            const t = _bind$2[_];
            const _bind$3 = t.length;
            let _tmp$2 = 0;
            while (true) {
              const _$2 = _tmp$2;
              if (_$2 < _bind$3) {
                const x = t[_$2];
                if (x >>> 0 < avoid.length) {
                  avoid[x] = true;
                } else {
                  $oob();
                }
                _tmp$2 = _$2 + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            _tmp = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
      }
      mirrors = _M0FP310monkeyfist2mf4core14place__mirrors(hex, w, height, mirror_count, rng, avoid);
      if (mirrors.len === 0) {
        return undefined;
      }
    }
    let iropes;
    let istops;
    let iplan;
    _L: {
      if (core === undefined) {
        iropes = new _M0TPB5ArrayGRPB5ArrayGRP310monkeyfist2mf4core2PtEE([], 0);
        istops = new _M0TPB5ArrayGRPB5ArrayGiEE([], 0);
        iplan = undefined;
        break _L;
      } else {
        const _Some = core;
        const _c = _Some;
        iropes = _c.ropes;
        istops = _c.stops;
        iplan = _c.plan;
        break _L;
      }
    }
    const kf = _M0FP310monkeyfist2mf4core10knots__for(d) + 0;
    if (hex) {
      const _p = area >= 30 && d >= 20 ? 1 : 0;
      const _p$2 = _M0FP310monkeyfist2mf4core9js__round((area + 0) / (long_ropes ? 50 : 32) * strength * strength);
      const _p$3 = _p > _p$2 ? _p : _p$2;
      let _p$4;
      if (long_ropes) {
        _p$4 = 0;
      } else {
        const _p$5 = (area + 0) / 150;
        _p$4 = _M0FP310monkeyfist2mf4core9js__round(kf * (1 < _p$5 ? 1 : _p$5) * 0.7);
      }
      const knots = _p$3 > _p$4 ? _p$3 : _p$4;
      let traps;
      if (long_ropes) {
        traps = 0;
      } else {
        const _p$5 = (area + 0) / 150;
        traps = _M0FP310monkeyfist2mf4core9js__round(kf * (1 < _p$5 ? 1 : _p$5));
      }
      const _bind = _M0FP310monkeyfist2mf4core10hex__build(rng, new _M0TP310monkeyfist2mf4core6HexCfg(w, height, _M0FP310monkeyfist2mf4core9js__round(d * 0.59), 0.99, length, strength * 8, mirrors, knots, traps, iropes, istops, iplan));
      if (_bind === undefined) {
        return undefined;
      } else {
        const _Some = _bind;
        const _raw = _Some;
        const turning = mirrors.len > 0 ? _M0FP310monkeyfist2mf4core12hex__turning(w, height, mirrors, _raw.ropes) : new _M0TPB5ArrayGiE([], 0);
        const _tmp = _raw.ropes;
        const _p$5 = mirrors;
        const _p$6 = new _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE([], 0);
        const _p$7 = _p$5.len;
        const _p$8 = _p$5.buf;
        let _tmp$2;
        let _tmp$3 = 0;
        while (true) {
          const _p$9 = _tmp$3;
          if (_p$9 < _p$7) {
            const _p$10 = _p$8[_p$9];
            if (_M0FP310monkeyfist2mf4core8contains(turning, _M0FP310monkeyfist2mf4core9hex__cell(_p$10.cell, w))) {
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(_p$6, _p$10);
            }
            _tmp$3 = _p$9 + 1 | 0;
            continue;
          } else {
            _tmp$2 = _p$6;
            break;
          }
        }
        return new _M0TP310monkeyfist2mf4core5Board(true, w, height, _tmp, _tmp$2, new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0), _raw.plan);
      }
    }
    const knots = long_ropes ? _M0FP310monkeyfist2mf4core9js__round((area + 0) / 40 * strength) : _M0FP310monkeyfist2mf4core10knots__for(d);
    const traps = long_ropes ? _M0FP310monkeyfist2mf4core9js__round((area + 0) / 70 * strength) : _M0FP310monkeyfist2mf4core10knots__for(d);
    const mmap = new _M0TP310monkeyfist2mf4core9SqMirrors($make_array_len_and_init(area, -1), new _M0TPB5ArrayGiE([], 0));
    const _bind = mirrors;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const m = _bind$3[_];
        _M0MP310monkeyfist2mf4core9SqMirrors3set(mmap, (Math.imul(m.cell.r, w) | 0) + m.cell.q | 0, m.kind);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _tmp$2 = long_ropes ? 6 : style.len_lo;
    let _tmp$3;
    if (long_ropes) {
      _tmp$3 = length;
    } else {
      const _p = style.len_lo;
      const _p$2 = _M0MP310monkeyfist2mf4core5Style7len__hi(style, w < height ? w : height);
      _tmp$3 = _p > _p$2 ? _p : _p$2;
    }
    const _bind$4 = _M0FP310monkeyfist2mf4core5weave(rng, new _M0TP310monkeyfist2mf4core8WeaveCfg(w, height, _tmp$2, _tmp$3, long_ropes ? 2 : style.min_len, style.straight, 0.99, strength * 8, knots, traps, long_ropes ? 5 : 3, mmap, iropes, istops, iplan));
    if (_bind$4 === undefined) {
      return undefined;
    } else {
      const _Some = _bind$4;
      const _raw = _Some;
      const used = $make_array_len_and_init(area, false);
      if (mirrors.len > 0) {
        const _p = _M0FP310monkeyfist2mf4core10sq__tracks(_M0FP310monkeyfist2mf4core11some__paths(_raw.ropes), w, height, mmap);
        let _bind$5;
        if (_p === undefined) {
          _bind$5 = $panic();
        } else {
          const _p$2 = _p;
          _bind$5 = _p$2;
        }
        const _bind$6 = _bind$5.len;
        const _bind$7 = _bind$5.buf;
        let _tmp$4 = 0;
        while (true) {
          const _ = _tmp$4;
          if (_ < _bind$6) {
            const t = _bind$7[_];
            const _bind$8 = t.length;
            let _tmp$5 = 0;
            while (true) {
              const _$2 = _tmp$5;
              if (_$2 < _bind$8) {
                const c = t[_$2];
                if (c >>> 0 < used.length) {
                  used[c] = true;
                } else {
                  $oob();
                }
                _tmp$5 = _$2 + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            _tmp$4 = _ + 1 | 0;
            continue;
          } else {
            break;
          }
        }
      }
      const _tmp$4 = _raw.ropes;
      const _p = mirrors;
      const _p$2 = new _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE([], 0);
      const _p$3 = _p.len;
      const _p$4 = _p.buf;
      let _tmp$5;
      let _tmp$6 = 0;
      while (true) {
        const _p$5 = _tmp$6;
        if (_p$5 < _p$3) {
          const _p$6 = _p$4[_p$5];
          const _tmp$7 = (Math.imul(_p$6.cell.r, w) | 0) + _p$6.cell.q | 0;
          if (_tmp$7 >>> 0 < used.length ? used[_tmp$7] : $oob()) {
            _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(_p$2, _p$6);
          }
          _tmp$6 = _p$5 + 1 | 0;
          continue;
        } else {
          _tmp$5 = _p$2;
          break;
        }
      }
      return new _M0TP310monkeyfist2mf4core5Board(false, w, height, _tmp$4, _tmp$5, new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0), _raw.taps);
    }
  }
  function _M0FP310monkeyfist2mf4core12bounce__step(b, g, plan, at) {
    const played = _M0MP310monkeyfist2mf4core5Board12replay__plan(b, g, plan);
    if (!played.solved) {
      return -1;
    }
    const start = _M0FP310monkeyfist2mf4core11some__paths(b.ropes);
    let paths = start;
    const _bind = played.taps;
    let _tmp = 0;
    while (true) {
      const step = _tmp;
      if (step < _bind) {
        const _tmp$2 = paths;
        if (step < 0 || step >= plan.len) {
          $panic();
        }
        const _p = _M0MP310monkeyfist2mf4core3Geo3tap(g, _tmp$2, plan.buf[step]);
        let mv;
        if (_p === undefined) {
          mv = $panic();
        } else {
          const _p$2 = _p;
          mv = _p$2;
        }
        let _tmp$3;
        if (mv.event === 1) {
          const _p$2 = _M0FP310monkeyfist2mf4core4last(mv.route);
          _tmp$3 = _p$2.q === at.q && _p$2.r === at.r;
        } else {
          _tmp$3 = false;
        }
        if (_tmp$3) {
          let _tmp$4;
          _L: {
            _L$2: {
              if (step < 0 || step >= plan.len) {
                $panic();
              }
              const _bind$2 = _M0MP310monkeyfist2mf4core3Geo3tap(g, start, plan.buf[step]);
              if (_bind$2 === undefined) {
                break _L$2;
              } else {
                const _Some = _bind$2;
                const _m = _Some;
                if (_m.event === 1) {
                  _tmp$4 = -1;
                } else {
                  break _L$2;
                }
              }
              break _L;
            }
            _tmp$4 = step;
          }
          return _tmp$4;
        }
        paths = mv.paths;
        _tmp = step + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return -1;
  }
  function _M0FP310monkeyfist2mf4core15search__spinner(board, cell) {
    const springs = _M0MPC15array5Array4copyGRP310monkeyfist2mf4core2PtE(board.springs);
    _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(springs, cell);
    const b = _M0MP310monkeyfist2mf4core5Board13with__springs(board, springs, board.plan);
    const g = _M0MP310monkeyfist2mf4core5Board3geo(b);
    const solution = _M0MP310monkeyfist2mf4core5Board5solve(b, g, _M0FP310monkeyfist2mf4core11some__paths(b.ropes), _M0FP310monkeyfist2mf4core9js__round(12000 / (b.ropes.len + 0)), board.plan);
    return _M0IPC16option6OptionPB2Eq5equalGbE(solution.solved, _M0FP310monkeyfist2mf4core15search__spinnerN6constrS5651) && _M0FP310monkeyfist2mf4core12bounce__step(b, g, solution.moves, cell) >= 0 ? _M0MP310monkeyfist2mf4core5Board10with__plan(b, solution.moves) : undefined;
  }
  function _M0FP310monkeyfist2mf4core9ways__out(board) {
    const out = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
    const w = board.w;
    if (board.hex) {
      const tracks = _M0FP310monkeyfist2mf4core17hex__compile__exn(board.w, board.h, board.mirrors, _M0FP310monkeyfist2mf4core11some__paths(board.ropes)).tracks;
      const _bind = tracks.len;
      const _bind$2 = tracks.buf;
      let _tmp = 0;
      while (true) {
        const i = _tmp;
        if (i < _bind) {
          const t = _bind$2[i];
          const _bind$3 = board.ropes;
          if (i < 0 || i >= _bind$3.len) {
            $panic();
          }
          const _bind$4 = _bind$3.buf[i].len;
          const _bind$5 = t.length;
          let _tmp$2 = _bind$4;
          while (true) {
            const k = _tmp$2;
            if (k < _bind$5) {
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(out, _M0FP310monkeyfist2mf4core10hex__point(k >>> 0 < t.length ? t[k] : $oob(), w));
              _tmp$2 = k + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          _tmp = i + 1 | 0;
          continue;
        } else {
          break;
        }
      }
    } else {
      const _p = _M0FP310monkeyfist2mf4core10sq__tracks(_M0FP310monkeyfist2mf4core11some__paths(board.ropes), board.w, board.h, _M0MP310monkeyfist2mf4core9SqMirrors9of__board(board));
      let tracks;
      if (_p === undefined) {
        tracks = $panic();
      } else {
        const _p$2 = _p;
        tracks = _p$2;
      }
      const _bind = tracks.len;
      const _bind$2 = tracks.buf;
      let _tmp = 0;
      while (true) {
        const i = _tmp;
        if (i < _bind) {
          const t = _bind$2[i];
          const _bind$3 = board.ropes;
          if (i < 0 || i >= _bind$3.len) {
            $panic();
          }
          const _bind$4 = _bind$3.buf[i].len;
          const _bind$5 = t.length;
          let _tmp$2 = _bind$4;
          while (true) {
            const k = _tmp$2;
            if (k < _bind$5) {
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(out, new _M0TP310monkeyfist2mf4core2Pt((k >>> 0 < t.length ? t[k] : $oob()) % w | 0, (k >>> 0 < t.length ? t[k] : $oob()) / w | 0));
              _tmp$2 = k + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          _tmp = i + 1 | 0;
          continue;
        } else {
          break;
        }
      }
    }
    return out;
  }
  function _M0FP310monkeyfist2mf4core13with__spinner(board, cell) {
    const springs = _M0MPC15array5Array4copyGRP310monkeyfist2mf4core2PtE(board.springs);
    _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(springs, cell);
    const b = _M0MP310monkeyfist2mf4core5Board13with__springs(board, springs, board.plan);
    const g = _M0MP310monkeyfist2mf4core5Board3geo(b);
    let paths = _M0FP310monkeyfist2mf4core11some__paths(b.ropes);
    const _bind = b.plan.len;
    let _tmp = 0;
    while (true) {
      const step = _tmp;
      if (step < _bind) {
        const _bind$2 = b.plan;
        if (step < 0 || step >= _bind$2.len) {
          $panic();
        }
        const i = _bind$2.buf[step];
        const _bind$3 = _M0MP310monkeyfist2mf4core3Geo3tap(g, paths, i);
        if (_bind$3 === undefined) {
          return undefined;
        } else {
          const _Some = _bind$3;
          const _mv = _Some;
          let _tmp$2;
          if (_mv.event === 1) {
            const _p = _M0FP310monkeyfist2mf4core4last(_mv.route);
            _tmp$2 = _p.q === cell.q && _p.r === cell.r;
          } else {
            _tmp$2 = false;
          }
          if (_tmp$2) {
            const a = _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(b.plan, 0, step + 1 | 0));
            _M0MPC15array5Array4pushGiE(a, i);
            const _bind$4 = step + 1 | 0;
            const _bind$5 = b.plan.len;
            let _tmp$3 = _bind$4;
            while (true) {
              const k = _tmp$3;
              if (k < _bind$5) {
                const _bind$6 = b.plan;
                if (k < 0 || k >= _bind$6.len) {
                  $panic();
                }
                _M0MPC15array5Array4pushGiE(a, _bind$6.buf[k]);
                _tmp$3 = k + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            const z = _M0MPC15array5Array4copyGiE(b.plan);
            _M0MPC15array5Array4pushGiE(z, i);
            let _bind_buf = [a, z];
            let _bind_len = 2;
            const _bind$6 = _bind_len;
            const _bind$7 = _bind_buf;
            let _tmp$4 = 0;
            while (true) {
              const _ = _tmp$4;
              if (_ < _bind$6) {
                const plan = _bind$7[_];
                if (_M0FP310monkeyfist2mf4core12bounce__step(b, g, plan, cell) === step) {
                  return _M0MP310monkeyfist2mf4core5Board10with__plan(b, plan);
                }
                _tmp$4 = _ + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            return undefined;
          }
          paths = _mv.paths;
        }
        _tmp = step + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return undefined;
  }
  function _M0FP310monkeyfist2mf4core13add__spinnersN5freshS5711(_env, group) {
    const g = _env._3;
    const rng = _env._2;
    const seen = _env._1;
    const blocked = _env._0;
    const _p = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
    const _p$2 = group.len;
    const _p$3 = group.buf;
    let cells;
    let _tmp = 0;
    while (true) {
      const _p$4 = _tmp;
      if (_p$4 < _p$2) {
        const _p$5 = _p$3[_p$4];
        let _tmp$2;
        let _p$6;
        _L: {
          _L$2: {
            let _tmp$3;
            if (!_M0MP310monkeyfist2mf4core3Geo6inside(g, _p$5)) {
              _tmp$3 = true;
            } else {
              let _tmp$4;
              const _tmp$5 = _M0MP310monkeyfist2mf4core3Geo4cell(g, _p$5);
              if (_tmp$5 >>> 0 < blocked.length ? blocked[_tmp$5] : $oob()) {
                _tmp$4 = true;
              } else {
                _tmp$4 = _M0MPB3Map8containsGibE(seen, ((Math.imul(_p$5.q + 4096 | 0, 8192) | 0) + _p$5.r | 0) + 4096 | 0);
              }
              _tmp$3 = _tmp$4;
            }
            if (_tmp$3) {
              _p$6 = false;
              break _L$2;
            }
            _M0MPB3Map3setGibE(seen, ((Math.imul(_p$5.q + 4096 | 0, 8192) | 0) + _p$5.r | 0) + 4096 | 0, true);
            _tmp$2 = true;
            break _L;
          }
          _tmp$2 = _p$6;
        }
        if (_tmp$2) {
          _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(_p, _p$5);
        }
        _tmp = _p$4 + 1 | 0;
        continue;
      } else {
        cells = _p;
        break;
      }
    }
    let _tmp$2 = cells.len - 1 | 0;
    while (true) {
      const i = _tmp$2;
      if (i > 0) {
        const j = _M0MP310monkeyfist2mf4core3Rng5below(rng, i + 1 | 0);
        if (i < 0 || i >= cells.len) {
          $panic();
        }
        const t = cells.buf[i];
        if (j < 0 || j >= cells.len) {
          $panic();
        }
        const _bind = cells.buf[j];
        if (i < 0 || i >= cells.len) {
          $panic();
        }
        cells.buf[i] = _bind;
        if (j < 0 || j >= cells.len) {
          $panic();
        }
        cells.buf[j] = t;
        _tmp$2 = i - 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return cells;
  }
  function _M0FP310monkeyfist2mf4core13add__spinnersN10try__cellsS5712(board, cells) {
    const _p = cells.len;
    const _p$2 = _M0MPC15array9ArrayView9to__ownedGRP310monkeyfist2mf4core2PtE(_M0MPC15array5Array21clamped__view_2einnerGRP310monkeyfist2mf4core2PtE(cells, 0, 16 < _p ? 16 : _p));
    const _p$3 = _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(_p$2.len);
    const _p$4 = _p$2.len;
    const _p$5 = _p$2.buf;
    let _tmp = 0;
    while (true) {
      const _p$6 = _tmp;
      if (_p$6 < _p$4) {
        const _p$7 = _p$5[_p$6];
        const _p$8 = _M0FP310monkeyfist2mf4core13with__spinner(board.val, _p$7);
        _p$3.buf[_p$6] = _p$8;
        _tmp = _p$6 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const first = _p$3;
    const _bind = first.len;
    const _bind$2 = first.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind) {
        const x = _bind$2[_];
        if (x === undefined) {
        } else {
          return x;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _p$6 = cells.len;
    const _p$7 = _M0MPC15array9ArrayView9to__ownedGRP310monkeyfist2mf4core2PtE(_M0MPC15array5Array21clamped__view_2einnerGRP310monkeyfist2mf4core2PtE(cells, 0, 8 < _p$6 ? 8 : _p$6));
    const _p$8 = _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(_p$7.len);
    const _p$9 = _p$7.len;
    const _p$10 = _p$7.buf;
    let _tmp$3 = 0;
    while (true) {
      const _p$11 = _tmp$3;
      if (_p$11 < _p$9) {
        const _p$12 = _p$10[_p$11];
        const _p$13 = _M0FP310monkeyfist2mf4core15search__spinner(board.val, _p$12);
        _p$8.buf[_p$11] = _p$13;
        _tmp$3 = _p$11 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const second = _p$8;
    const _bind$3 = second.len;
    const _bind$4 = second.buf;
    let _tmp$4 = 0;
    while (true) {
      const _ = _tmp$4;
      if (_ < _bind$3) {
        const x = _bind$4[_];
        if (x === undefined) {
        } else {
          return x;
        }
        _tmp$4 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return undefined;
  }
  function _M0FP310monkeyfist2mf4core13add__spinners(start, rng, count) {
    const board = new _M0TPB8MutLocalGRP310monkeyfist2mf4core5BoardE(start);
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < count) {
        const g = _M0MP310monkeyfist2mf4core5Board3geo(board.val);
        const blocked = $make_array_len_and_init(Math.imul(board.val.w, board.val.h) | 0, false);
        const _bind = board.val.ropes;
        const _bind$2 = _bind.len;
        const _bind$3 = _bind.buf;
        let _tmp$2 = 0;
        while (true) {
          const _$2 = _tmp$2;
          if (_$2 < _bind$2) {
            const path = _bind$3[_$2];
            const _bind$4 = path.len;
            const _bind$5 = path.buf;
            let _tmp$3 = 0;
            while (true) {
              const _$3 = _tmp$3;
              if (_$3 < _bind$4) {
                const p = _bind$5[_$3];
                const _tmp$4 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
                if (_tmp$4 >>> 0 < blocked.length) {
                  blocked[_tmp$4] = true;
                } else {
                  $oob();
                }
                _tmp$3 = _$3 + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            _tmp$2 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const _bind$4 = board.val.mirrors;
        const _bind$5 = _bind$4.len;
        const _bind$6 = _bind$4.buf;
        let _tmp$3 = 0;
        while (true) {
          const _$2 = _tmp$3;
          if (_$2 < _bind$5) {
            const m = _bind$6[_$2];
            const _tmp$4 = _M0MP310monkeyfist2mf4core3Geo4cell(g, m.cell);
            if (_tmp$4 >>> 0 < blocked.length) {
              blocked[_tmp$4] = true;
            } else {
              $oob();
            }
            _tmp$3 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const _bind$7 = board.val.springs;
        const _bind$8 = _bind$7.len;
        const _bind$9 = _bind$7.buf;
        let _tmp$4 = 0;
        while (true) {
          const _$2 = _tmp$4;
          if (_$2 < _bind$8) {
            const p = _bind$9[_$2];
            const _tmp$5 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
            if (_tmp$5 >>> 0 < blocked.length) {
              blocked[_tmp$5] = true;
            } else {
              $oob();
            }
            _tmp$4 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const _bind$10 = board.val.ropes;
        const _bind$11 = _bind$10.len;
        const _bind$12 = _bind$10.buf;
        let _tmp$5 = 0;
        while (true) {
          const _$2 = _tmp$5;
          if (_$2 < _bind$11) {
            const path = _bind$12[_$2];
            const _bind$13 = _M0MP310monkeyfist2mf4core3Geo9direction(g, path);
            const _dq = _bind$13._0;
            const _dr = _bind$13._1;
            const p = new _M0TP310monkeyfist2mf4core2Pt(_M0FP310monkeyfist2mf4core4last(path).q + _dq | 0, _M0FP310monkeyfist2mf4core4last(path).r + _dr | 0);
            if (_M0MP310monkeyfist2mf4core3Geo6inside(g, p)) {
              const _tmp$6 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
              if (_tmp$6 >>> 0 < blocked.length) {
                blocked[_tmp$6] = true;
              } else {
                $oob();
              }
            }
            _tmp$5 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const manual = _M0MP310monkeyfist2mf4core5Board12replay__plan(board.val, g, board.val.plan).taps;
        const routes = new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
        let paths = _M0FP310monkeyfist2mf4core11some__paths(board.val.ropes);
        let _tmp$6 = 0;
        while (true) {
          const step = _tmp$6;
          if (step < manual) {
            const _bind$13 = board.val.plan;
            if (step < 0 || step >= _bind$13.len) {
              $panic();
            }
            const i = _bind$13.buf[step];
            const _p = _M0MP310monkeyfist2mf4core3Geo3tap(g, paths, i);
            let mv;
            if (_p === undefined) {
              mv = $panic();
            } else {
              const _p$2 = _p;
              mv = _p$2;
            }
            const _bind$14 = paths;
            if (i < 0 || i >= _bind$14.len) {
              $panic();
            }
            const _p$2 = _bind$14.buf[i];
            let _tmp$7;
            if (_p$2 === undefined) {
              _tmp$7 = $panic();
            } else {
              const _p$3 = _p$2;
              _tmp$7 = _p$3;
            }
            const len = _tmp$7.len;
            const _bind$15 = mv.route.len;
            let _tmp$8 = len;
            while (true) {
              const k = _tmp$8;
              if (k < _bind$15) {
                const _bind$16 = mv.route;
                if (k < 0 || k >= _bind$16.len) {
                  $panic();
                }
                _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(routes, _bind$16.buf[k]);
                _tmp$8 = k + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            paths = mv.paths;
            _tmp$6 = step + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        const _bind$13 = [];
        const seen = _M0MPB3Map3MapGibE(new _M0TPB9ArrayViewGUibEE(_bind$13, 0, 0), undefined);
        const _env = { _0: blocked, _1: seen, _2: rng, _3: g };
        const _bind$14 = _M0FP310monkeyfist2mf4core13add__spinnersN10try__cellsS5712(board, _M0FP310monkeyfist2mf4core13add__spinnersN5freshS5711(_env, routes));
        let placed;
        if (_bind$14 === undefined) {
          placed = _M0FP310monkeyfist2mf4core13add__spinnersN10try__cellsS5712(board, _M0FP310monkeyfist2mf4core13add__spinnersN5freshS5711(_env, _M0FP310monkeyfist2mf4core9ways__out(board.val)));
        } else {
          const _Some = _bind$14;
          const _b = _Some;
          placed = _b;
        }
        if (placed === undefined) {
          return undefined;
        } else {
          const _Some = placed;
          const _b = _Some;
          board.val = _b;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return board.val;
  }
  function _M0FP310monkeyfist2mf4core14features__used(b, g) {
    const wanted = $make_array_len_and_init(Math.imul(b.w, b.h) | 0, false);
    let left = 0;
    const _bind = b.springs;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const p = _bind$3[_];
        const _tmp$2 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
        if (!(_tmp$2 >>> 0 < wanted.length ? wanted[_tmp$2] : $oob())) {
          const _tmp$3 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
          if (_tmp$3 >>> 0 < wanted.length) {
            wanted[_tmp$3] = true;
          } else {
            $oob();
          }
          left = left + 1 | 0;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$4 = b.mirrors;
    const _bind$5 = _bind$4.len;
    const _bind$6 = _bind$4.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$5) {
        const m = _bind$6[_];
        const _tmp$3 = _M0MP310monkeyfist2mf4core3Geo4cell(g, m.cell);
        if (!(_tmp$3 >>> 0 < wanted.length ? wanted[_tmp$3] : $oob())) {
          const _tmp$4 = _M0MP310monkeyfist2mf4core3Geo4cell(g, m.cell);
          if (_tmp$4 >>> 0 < wanted.length) {
            wanted[_tmp$4] = true;
          } else {
            $oob();
          }
          left = left + 1 | 0;
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let paths = _M0FP310monkeyfist2mf4core11some__paths(b.ropes);
    const _bind$7 = b.plan;
    const _bind$8 = _bind$7.len;
    const _bind$9 = _bind$7.buf;
    let _tmp$3 = 0;
    while (true) {
      const _ = _tmp$3;
      if (_ < _bind$8) {
        const i = _bind$9[_];
        const _bind$10 = _M0MP310monkeyfist2mf4core3Geo3tap(g, paths, i);
        if (_bind$10 === undefined) {
          return false;
        } else {
          const _Some = _bind$10;
          const _mv = _Some;
          const _bind$11 = paths;
          if (i < 0 || i >= _bind$11.len) {
            $panic();
          }
          const _p = _bind$11.buf[i];
          let _tmp$4;
          if (_p === undefined) {
            _tmp$4 = $panic();
          } else {
            const _p$2 = _p;
            _tmp$4 = _p$2;
          }
          const len = _tmp$4.len;
          const _bind$12 = _mv.route.len;
          let _tmp$5 = len;
          while (true) {
            const k = _tmp$5;
            if (k < _bind$12) {
              const _bind$13 = _mv.route;
              if (k < 0 || k >= _bind$13.len) {
                $panic();
              }
              const p = _bind$13.buf[k];
              let _tmp$6;
              if (_M0MP310monkeyfist2mf4core3Geo6inside(g, p)) {
                const _tmp$7 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
                _tmp$6 = _tmp$7 >>> 0 < wanted.length ? wanted[_tmp$7] : $oob();
              } else {
                _tmp$6 = false;
              }
              if (_tmp$6) {
                const _tmp$7 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
                if (_tmp$7 >>> 0 < wanted.length) {
                  wanted[_tmp$7] = false;
                } else {
                  $oob();
                }
                left = left - 1 | 0;
              }
              _tmp$5 = k + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          paths = _mv.paths;
        }
        _tmp$3 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return left === 0;
  }
  function _M0FP310monkeyfist2mf4core14feature__statsN5countS5839(a) {
    return _M0MPB4Iter5countGbE(_M0MPB4Iter6filterGbE(_M0MPC15array10FixedArray4iterGbE(a), (x) => x));
  }
  function _M0FP310monkeyfist2mf4core14feature__stats(b, g, plan, manual) {
    const area = Math.imul(b.w, b.h) | 0;
    const turned = $make_array_len_and_init(area, false);
    const bounced = $make_array_len_and_init(area, false);
    const mturned = $make_array_len_and_init(area, false);
    const mbounced = $make_array_len_and_init(area, false);
    let paths = _M0FP310monkeyfist2mf4core11some__paths(b.ropes);
    const _bind = plan.len;
    const _bind$2 = plan.buf;
    let _tmp = 0;
    while (true) {
      const step = _tmp;
      if (step < _bind) {
        const i = _bind$2[step];
        const _bind$3 = paths;
        if (i < 0 || i >= _bind$3.len) {
          $panic();
        }
        const path = _bind$3.buf[i];
        const _bind$4 = _M0MP310monkeyfist2mf4core3Geo3tap(g, paths, i);
        if (_bind$4 === undefined) {
          return undefined;
        } else {
          const _Some = _bind$4;
          const _mv = _Some;
          let _tmp$2;
          if (path === undefined) {
            _tmp$2 = $panic();
          } else {
            const _p = path;
            _tmp$2 = _p;
          }
          const len = _tmp$2.len;
          const _bind$5 = _mv.route.len;
          let _tmp$3 = len;
          while (true) {
            const at = _tmp$3;
            if (at < _bind$5) {
              _L: {
                const _bind$6 = _mv.route;
                if (at < 0 || at >= _bind$6.len) {
                  $panic();
                }
                const p = _bind$6.buf[at];
                if (!_M0MP310monkeyfist2mf4core3Geo6inside(g, p)) {
                  break _L;
                }
                const _tmp$4 = g.mirror;
                const _tmp$5 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
                const m = _tmp$5 >>> 0 < _tmp$4.length ? _tmp$4[_tmp$5] : $oob();
                if (m < 0) {
                  break _L;
                }
                const _bind$7 = _mv.route;
                const _bind$8 = at - 1 | 0;
                if (_bind$8 < 0 || _bind$8 >= _bind$7.len) {
                  $panic();
                }
                const before = _bind$7.buf[_bind$8];
                const dq = p.q - before.q | 0;
                const dr = p.r - before.r | 0;
                let _bind$9;
                if (b.hex) {
                  const _p = _M0FP310monkeyfist2mf4core15hex__dir__index(dq, dr);
                  const d = ((((Math.imul(2, m) | 0) - _p | 0) % 6 | 0) + 6 | 0) % 6 | 0;
                  _bind$9 = { _0: d >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[d] : $oob(), _1: d >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[d] : $oob() };
                } else {
                  _bind$9 = _M0FP310monkeyfist2mf4core4turn(m, dq, dr);
                }
                const _oq = _bind$9._0;
                const _or_ = _bind$9._1;
                if (_oq !== dq || _or_ !== dr) {
                  const _tmp$6 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
                  if (_tmp$6 >>> 0 < turned.length) {
                    turned[_tmp$6] = true;
                  } else {
                    $oob();
                  }
                  if (step < manual) {
                    const _tmp$7 = _M0MP310monkeyfist2mf4core3Geo4cell(g, p);
                    if (_tmp$7 >>> 0 < mturned.length) {
                      mturned[_tmp$7] = true;
                    } else {
                      $oob();
                    }
                  }
                }
                break _L;
              }
              _tmp$3 = at + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          if (_mv.event === 1) {
            const c = _M0MP310monkeyfist2mf4core3Geo4cell(g, _M0FP310monkeyfist2mf4core4last(_mv.route));
            if (c >>> 0 < bounced.length) {
              bounced[c] = true;
            } else {
              $oob();
            }
            if (step < manual) {
              if (c >>> 0 < mbounced.length) {
                mbounced[c] = true;
              } else {
                $oob();
              }
            }
          }
          paths = _mv.paths;
        }
        _tmp = step + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return new _M0TP310monkeyfist2mf4core12FeatureStats(_M0FP310monkeyfist2mf4core14feature__statsN5countS5839(turned), _M0FP310monkeyfist2mf4core14feature__statsN5countS5839(bounced), _M0FP310monkeyfist2mf4core14feature__statsN5countS5839(mturned), _M0FP310monkeyfist2mf4core14feature__statsN5countS5839(mbounced));
  }
  function _M0FP310monkeyfist2mf4core8regionalN4zoneS5880(b, p) {
    const col = p.q + (b.hex ? _M0FP310monkeyfist2mf4core10floor__div(p.r, 2) : 0) | 0;
    return (col + 0 >= (b.w + 0) / 2 ? 1 : 0) + (Math.imul(2, p.r + 0 >= (b.h + 0) / 2 ? 1 : 0) | 0) | 0;
  }
  function _M0FP310monkeyfist2mf4core8regional(b) {
    if (b.w < 8 || b.h < 8) {
      return true;
    }
    let area_buf = [0, 0, 0, 0];
    let area_len = 4;
    let used_buf = [0, 0, 0, 0];
    let used_len = 4;
    const _bind = Math.imul(b.w, b.h) | 0;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const p = b.hex ? _M0FP310monkeyfist2mf4core10hex__point(i, b.w) : new _M0TP310monkeyfist2mf4core2Pt(i % b.w | 0, i / b.w | 0);
        const _index_20 = _M0FP310monkeyfist2mf4core8regionalN4zoneS5880(b, p);
        if (_index_20 < 0 || _index_20 >= area_len) {
          $panic();
        }
        const _bind$2 = area_buf[_index_20] + 1 | 0;
        if (_index_20 < 0 || _index_20 >= area_len) {
          $panic();
        }
        area_buf[_index_20] = _bind$2;
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$2 = b.ropes;
    const _bind$3 = _bind$2.len;
    const _bind$4 = _bind$2.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$3) {
        const path = _bind$4[_];
        const _bind$5 = path.len;
        const _bind$6 = path.buf;
        let _tmp$3 = 0;
        while (true) {
          const _$2 = _tmp$3;
          if (_$2 < _bind$5) {
            const p = _bind$6[_$2];
            const _index_22 = _M0FP310monkeyfist2mf4core8regionalN4zoneS5880(b, p);
            if (_index_22 < 0 || _index_22 >= used_len) {
              $panic();
            }
            const _bind$7 = used_buf[_index_22] + 1 | 0;
            if (_index_22 < 0 || _index_22 >= used_len) {
              $panic();
            }
            used_buf[_index_22] = _bind$7;
            _tmp$3 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    let _tmp$3 = 0;
    while (true) {
      const i = _tmp$3;
      if (i < 4) {
        if (i < 0 || i >= used_len) {
          $panic();
        }
        const _tmp$4 = used_buf[i] + 0;
        if (i < 0 || i >= area_len) {
          $panic();
        }
        if (!(_tmp$4 / (area_buf[i] + 0) >= 0.55)) {
          return false;
        }
        _tmp$3 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return true;
  }
  function _M0FP310monkeyfist2mf4core7trivial(b, g) {
    if (b.ropes.len <= 3) {
      return false;
    }
    const start = _M0FP310monkeyfist2mf4core11some__paths(b.ropes);
    const _bind = b.ropes.len;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const _bind$2 = _M0MP310monkeyfist2mf4core3Geo3tap(g, start, i);
        if (_bind$2 === undefined) {
        } else {
          const _Some = _bind$2;
          const _mv = _Some;
          if (_M0MP310monkeyfist2mf4core5Board9all__free(b, g, _mv.paths)) {
            return true;
          }
        }
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return false;
  }
  function _M0FP310monkeyfist2mf4core8postpone(b, g, plan) {
    let best = plan;
    let taps = _M0MP310monkeyfist2mf4core5Board12replay__plan(b, g, plan).taps;
    const _p = taps;
    const _p$2 = best.len;
    let _tmp = (_p < _p$2 ? _p : _p$2) - 1 | 0;
    while (true) {
      const k = _tmp;
      if (k >= 0) {
        _L: {
          const _bind = best;
          if (k < 0 || k >= _bind.len) {
            $panic();
          }
          const i = _bind.buf[k];
          if (_M0FP310monkeyfist2mf4core11index__from(best, i, k + 1 | 0) >= 0) {
            break _L;
          }
          const trial = _M0MPC15array9ArrayView9to__ownedGiE(_M0MPC15array5Array21clamped__view_2einnerGiE(best, 0, k));
          const _bind$2 = k + 1 | 0;
          const _bind$3 = best.len;
          let _tmp$2 = _bind$2;
          while (true) {
            const j = _tmp$2;
            if (j < _bind$3) {
              const _bind$4 = best;
              if (j < 0 || j >= _bind$4.len) {
                $panic();
              }
              _M0MPC15array5Array4pushGiE(trial, _bind$4.buf[j]);
              _tmp$2 = j + 1 | 0;
              continue;
            } else {
              break;
            }
          }
          _M0MPC15array5Array4pushGiE(trial, i);
          const r = _M0MP310monkeyfist2mf4core5Board12replay__plan(b, g, trial);
          if (r.solved && r.taps < taps) {
            best = trial;
            taps = r.taps;
          }
          break _L;
        }
        _tmp = k - 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return best;
  }
  function _M0FP310monkeyfist2mf4core5score(b, g, skip) {
    if (skip) {
      return new _M0TP310monkeyfist2mf4core3Par(b.plan, _M0MP310monkeyfist2mf4core5Board12replay__plan(b, g, b.plan).taps, false);
    }
    if (b.springs.len === 0 && !b.hex) {
      const paths = _M0FP310monkeyfist2mf4core11some__paths(b.ropes);
      const _bind = _M0FP310monkeyfist2mf4core19sq__postpone__exits(paths, b.w, b.h, b.plan, g.sqm);
      let start;
      if (_bind === undefined) {
        start = b.plan;
      } else {
        const _Some = _bind;
        start = _Some;
      }
      const _p = _M0FP310monkeyfist2mf4core24sq__fewest__player__taps(paths, b.w, b.h, start, 2500, g.sqm);
      let _tmp;
      if (_p === undefined) {
        _tmp = $panic();
      } else {
        const _p$2 = _p;
        _tmp = _p$2;
      }
      return _tmp;
    }
    if (b.springs.len === 0) {
      const _bind = _M0FP310monkeyfist2mf4core20hex__postpone__exits(b.w, b.h, b.mirrors, b.ropes, b.plan);
      let start;
      if (_bind === undefined) {
        start = b.plan;
      } else {
        const _Some = _bind;
        start = _Some;
      }
      return _M0FP310monkeyfist2mf4core25hex__fewest__player__taps(b.w, b.h, b.mirrors, b.ropes, start, 2500);
    }
    const start = _M0FP310monkeyfist2mf4core8postpone(b, g, b.plan);
    return b.ropes.len <= 12 ? _M0MP310monkeyfist2mf4core5Board13minimum__taps(b, g, start, 1200) : new _M0TP310monkeyfist2mf4core3Par(start, _M0MP310monkeyfist2mf4core5Board12replay__plan(b, g, start).taps, false);
  }
  function _M0FP310monkeyfist2mf4core12casual__rate(b, g, rng, games) {
    if (b.springs.len === 0 && !b.hex) {
      return _M0FP310monkeyfist2mf4core16sq__casual__wins(_M0FP310monkeyfist2mf4core11some__paths(b.ropes), b.w, b.h, rng, games, g.sqm);
    }
    if (b.springs.len === 0) {
      return _M0FP310monkeyfist2mf4core17hex__casual__wins(b.w, b.h, b.mirrors, b.ropes, rng, games);
    }
    let wins = 0;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < games) {
        let paths = _M0FP310monkeyfist2mf4core11some__paths(b.ropes);
        const _bind = (Math.imul(b.ropes.len, 6) | 0) + 20 | 0;
        let _tmp$2 = 0;
        while (true) {
          const _$2 = _tmp$2;
          if (_$2 < _bind) {
            const moves = new _M0TPB5ArrayGRP310monkeyfist2mf4core4MoveE([], 0);
            const _bind$2 = paths.len;
            let _tmp$3 = 0;
            while (true) {
              const i = _tmp$3;
              if (i < _bind$2) {
                const _bind$3 = paths;
                if (i < 0 || i >= _bind$3.len) {
                  $panic();
                }
                const _bind$4 = _bind$3.buf[i];
                if (_bind$4 === undefined) {
                } else {
                  const _bind$5 = _M0MP310monkeyfist2mf4core3Geo3tap(g, paths, i);
                  if (_bind$5 === undefined) {
                  } else {
                    const _Some = _bind$5;
                    const _m = _Some;
                    _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(moves, _m);
                  }
                }
                _tmp$3 = i + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            if (moves.len === 0) {
              break;
            }
            const _p = new _M0TPB5ArrayGRP310monkeyfist2mf4core4MoveE([], 0);
            const _p$2 = moves.len;
            const _p$3 = moves.buf;
            let exits;
            let _tmp$4 = 0;
            while (true) {
              const _p$4 = _tmp$4;
              if (_p$4 < _p$2) {
                const _p$5 = _p$3[_p$4];
                if (_p$5.event === 0) {
                  _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(_p, _p$5);
                }
                _tmp$4 = _p$4 + 1 | 0;
                continue;
              } else {
                exits = _p;
                break;
              }
            }
            const pool = exits.len > 0 ? exits : moves;
            const _bind$3 = _M0MP310monkeyfist2mf4core3Rng5below(rng, pool.len);
            if (_bind$3 < 0 || _bind$3 >= pool.len) {
              $panic();
            }
            paths = pool.buf[_bind$3].paths;
            if (_M0FP310monkeyfist2mf4core9all__gone(paths)) {
              wins = wins + 1 | 0;
              break;
            }
            _tmp$2 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return (wins + 0) / ((1 > games ? 1 : games) + 0);
  }
  function _M0FP310monkeyfist2mf4core17target__challenge(d) {
    const _p = 100 < d ? 100 : d;
    return 0.5 + 9.5 * _M0FPC14math3pow((0 > _p ? 0 : _p) / 100, 1.3);
  }
  function _M0FP310monkeyfist2mf4core12win__ceiling(d) {
    const _p = (d - 30) / 70;
    const _p$2 = 1 < _p ? 1 : _p;
    return 1 - 0.5 * (0 > _p$2 ? 0 : _p$2);
  }
  function _M0FP310monkeyfist2mf4core14grid__generate(s) {
    const w = s.w;
    const height = s.h;
    const d = s.difficulty;
    const rng = _M0FP310monkeyfist2mf4core7rng__of(`grid/3/${s.seed}`);
    const roll = _M0MP310monkeyfist2mf4core3Rng4next(rng);
    const twisty = (w < height ? w : height) >= 7 && d >= 35;
    const _tmp = roll < 0.4 ? 0 : roll < 0.73 || !twisty ? 1 : 2;
    const style = _tmp >>> 0 < _M0FP310monkeyfist2mf4core6styles.length ? _M0FP310monkeyfist2mf4core6styles[_tmp] : $oob();
    const colossal = s.colossal;
    const strength = d / 100;
    let spinner_count;
    if (s.springs) {
      const _p = s.min_springs;
      const _p$2 = 1 > _p ? 1 : _p;
      spinner_count = 1 > _p$2 ? 1 : _p$2;
    } else {
      spinner_count = 0;
    }
    const min_m = s.min_mirrors > 0 ? s.min_mirrors : 2;
    let mirror_count;
    if (!s.mirrors) {
      mirror_count = 0;
    } else {
      const _p = _M0FP310monkeyfist2mf4core9js__round(((Math.imul(w, height) | 0) + 0) / 14);
      const _p$2 = s.hex ? (Math.imul(2, min_m) | 0) + 2 | 0 : (min_m + 2 | 0) + _M0FP310monkeyfist2mf4core9js__round(2 * strength) | 0;
      mirror_count = _p < _p$2 ? _p : _p$2;
    }
    const _p = (d - 40) / 60;
    const hardness = 0 > _p ? 0 : _p;
    const sample_limit = colossal ? 3 : 10;
    const min_coverage = (Math.imul(w, height) | 0) <= 48 ? 0.8 : 0.85;
    const target = _M0FP310monkeyfist2mf4core17target__challenge(d);
    const ceiling = _M0FP310monkeyfist2mf4core12win__ceiling(d);
    let best = undefined;
    let best_value = -1e+300;
    let _tmp$2 = 0;
    while (true) {
      const attempt = _tmp$2;
      if (attempt < sample_limit) {
        _L: {
          const wants_core = d >= 60 && (attempt % 2 | 0) === 0;
          let cand = _M0FP310monkeyfist2mf4core5woven(s.hex, w, height, d, rng, style, colossal, mirror_count, wants_core);
          if (spinner_count > 0) {
            const _bind = cand;
            if (_bind === undefined) {
            } else {
              const _Some = _bind;
              const _b = _Some;
              if (_M0FP310monkeyfist2mf4core5valid(_b, _M0MP310monkeyfist2mf4core5Board3geo(_b))) {
                cand = _M0FP310monkeyfist2mf4core13add__spinners(_b, rng, spinner_count);
              }
            }
          }
          const _bind = cand;
          if (_bind === undefined) {
            break _L;
          } else {
            const _Some = _bind;
            const _b = _Some;
            const g = _M0MP310monkeyfist2mf4core5Board3geo(_b);
            const start = _M0FP310monkeyfist2mf4core11some__paths(_b.ropes);
            if (_b.w !== w || (_b.h !== height || (_b.ropes.len < 2 || (!_M0FP310monkeyfist2mf4core5valid(_b, g) || _M0MP310monkeyfist2mf4core5Board9all__free(_b, g, start))))) {
              break _L;
            }
            if (s.mirrors && _b.mirrors.len === 0 || s.springs && _b.springs.len === 0) {
              break _L;
            }
            const density = _M0FP310monkeyfist2mf4core8coverage(_b);
            if (density < min_coverage || !_M0FP310monkeyfist2mf4core8regional(_b)) {
              break _L;
            }
            const replayed = _M0MP310monkeyfist2mf4core5Board12replay__plan(_b, g, _b.plan);
            if (!replayed.solved || !_M0FP310monkeyfist2mf4core14features__used(_b, g)) {
              break _L;
            }
            const result = _M0FP310monkeyfist2mf4core5score(_b, g, colossal);
            const mech = _b.mirrors.len > 0 || _b.springs.len > 0 ? _M0FP310monkeyfist2mf4core14feature__stats(_b, g, result.plan, result.par) : undefined;
            if (mech === undefined) {
            } else {
              const _Some$2 = mech;
              const _m = _Some$2;
              if (_b.mirrors.len < s.min_mirrors || (_b.springs.len < s.min_springs || (_m.used_mirrors !== _b.mirrors.len || (_m.used_springs !== _b.springs.len || (_m.manual_mirrors < s.min_mirrors || _m.manual_springs < s.min_springs))))) {
                break _L;
              }
            }
            const played = _M0MP310monkeyfist2mf4core5Board12replay__plan(_b, g, result.plan);
            let slides = 0;
            let bounces = 0;
            let any_slide = false;
            let automatic = 0;
            const actions = _M0MPC15array5Array4makeGiE(_b.ropes.len, 0);
            const _bind$2 = played.events;
            const _bind$3 = _bind$2.len;
            const _bind$4 = _bind$2.buf;
            let _tmp$3 = 0;
            while (true) {
              const k = _tmp$3;
              if (k < _bind$3) {
                const e = _bind$4[k];
                if (e === 2) {
                  any_slide = true;
                  if (k < result.par) {
                    slides = slides + 1 | 0;
                    const _bind$5 = result.plan;
                    if (k < 0 || k >= _bind$5.len) {
                      $panic();
                    }
                    const _index_24 = _bind$5.buf[k];
                    if (_index_24 < 0 || _index_24 >= actions.len) {
                      $panic();
                    }
                    const _bind$6 = actions.buf[_index_24] + 1 | 0;
                    if (_index_24 < 0 || _index_24 >= actions.len) {
                      $panic();
                    }
                    actions.buf[_index_24] = _bind$6;
                  }
                } else {
                  if (e === 1 && k < result.par) {
                    bounces = bounces + 1 | 0;
                  } else {
                    if (e === 0 && k >= result.par) {
                      automatic = automatic + 1 | 0;
                    }
                  }
                }
                _tmp$3 = k + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            let repeated = 0;
            const _bind$5 = actions.len;
            const _bind$6 = actions.buf;
            let _tmp$4 = 0;
            while (true) {
              const _ = _tmp$4;
              if (_ < _bind$5) {
                const n = _bind$6[_];
                if (n >= 2) {
                  repeated = repeated + 1 | 0;
                }
                _tmp$4 = _ + 1 | 0;
                continue;
              } else {
                break;
              }
            }
            if ((s.require_slide || density < 0.85) && !any_slide) {
              break _L;
            }
            if ((Math.imul(result.par, 3) | 0) < _b.ropes.len || _M0FP310monkeyfist2mf4core7trivial(_b, g)) {
              break _L;
            }
            const inter = colossal ? 0 : _M0FP310monkeyfist2mf4core11interaction(_b, g, result.plan, result.par);
            const wins = colossal ? 1 : _M0FP310monkeyfist2mf4core12casual__rate(_b, g, _M0FP310monkeyfist2mf4core7rng__of(`casual/${s.seed}/${_M0MPC13int3Int18to__string_2einner(attempt, 10)}`), _b.springs.len > 0 ? 10 : 32);
            const work = (slides + bounces | 0) + 0;
            const challenge = work + 6 * (1 - wins);
            const _tmp$5 = density * 3 - Math.abs(challenge - target) * 0.5;
            const _p$2 = wins - ceiling;
            const value = _tmp$5 - (0 > _p$2 ? 0 : _p$2) * 4 + (colossal ? 0 : hardness * inter * 0.25);
            if (value > best_value) {
              best_value = value;
              best = new _M0TP310monkeyfist2mf4core5Level(_M0MP310monkeyfist2mf4core5Board10with__plan(_b, result.plan), result.par, result.exact, density, wins, challenge, "", slides, bounces, repeated, automatic, _M0MPC16option6Option7map__orGRP310monkeyfist2mf4core12FeatureStatsiE(mech, -1, (m) => m.used_mirrors), _M0MPC16option6Option7map__orGRP310monkeyfist2mf4core12FeatureStatsiE(mech, -1, (m) => m.used_springs), _M0MPC16option6Option7map__orGRP310monkeyfist2mf4core12FeatureStatsiE(mech, -1, (m) => m.manual_mirrors), _M0MPC16option6Option7map__orGRP310monkeyfist2mf4core12FeatureStatsiE(mech, -1, (m) => m.manual_springs));
            }
            if (colossal || density >= 0.9 && (Math.abs(challenge - target) <= 0.5 && wins <= ceiling)) {
              break;
            }
          }
          break _L;
        }
        _tmp$2 = attempt + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return best;
  }
  function _M0FP310monkeyfist2mf4core15casual__measure(b, seed, games) {
    return _M0FP310monkeyfist2mf4core12casual__rate(b, _M0MP310monkeyfist2mf4core5Board3geo(b), _M0FP310monkeyfist2mf4core7rng__of(seed), games);
  }
  function _M0FP310monkeyfist2mf4core9set__code(o) {
    if (o.journey) {
      return "J3-MONKEYFIST";
    }
    const flags = `${o.mirrors ? "M" : ""}${o.springs ? "S" : ""}${o.colossal ? "C" : ""}`;
    const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(10);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "U3-");
    _M0MPB13StringBuilder13write__objectGcE(_string_builder, o.grid);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "-");
    _M0MPB13StringBuilder13write__objectGiE(_string_builder, o.min);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "-");
    _M0MPB13StringBuilder13write__objectGiE(_string_builder, o.max);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "-");
    _M0MPB13StringBuilder13write__objectGiE(_string_builder, o.w);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "-");
    _M0MPB13StringBuilder13write__objectGiE(_string_builder, o.h);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "-");
    _M0MPB13StringBuilder13write__objectGiE(_string_builder, o.count);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "-");
    _M0MPB13StringBuilder13write__objectGsE(_string_builder, flags === "" ? "N" : flags);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, "-");
    _M0MPB13StringBuilder13write__objectGsE(_string_builder, o.seed);
    return _string_builder.val;
  }
  function _M0FP310monkeyfist2mf4core6digits(s, lo, hi) {
    if (s.length < lo || s.length > hi) {
      return undefined;
    }
    let v = 0;
    const _bind = s.length;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        const c = i >>> 0 < s.length ? s.charCodeAt(i) : $oob();
        if (c < 48 || c > 57) {
          return undefined;
        }
        v = ((Math.imul(v, 10) | 0) + c | 0) - 48 | 0;
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return v;
  }
  function _M0FP310monkeyfist2mf4core11parse__code(text) {
    const t = _M0MPC16string10StringView9to__owned(_M0MPC16string10StringView9to__upper(_M0MPC16string6String4trim(text, undefined)));
    if (t === "J3-MONKEYFIST") {
      return _M0FP310monkeyfist2mf4core11parse__codeN6constrS6056;
    }
    const parts = _M0MPB4Iter9to__arrayGsE(_M0MPB4Iter3mapGRPC16string10StringViewsE(_M0MPC16string6String5split(t, _M0FP310monkeyfist2mf4core11parse__codeN6recordS6057), (p) => _M0MPC16string10StringView9to__owned(p)));
    let _tmp;
    if (parts.len !== 9) {
      _tmp = true;
    } else {
      if (0 >= parts.len) {
        $panic();
      }
      const _p = parts.buf[0];
      const _p$2 = "U3";
      _tmp = !(_p === _p$2);
    }
    if (_tmp) {
      return undefined;
    }
    if (1 >= parts.len) {
      $panic();
    }
    const _bind = parts.buf[1];
    let grid;
    switch (_bind) {
      case "S": {
        grid = 83;
        break;
      }
      case "H": {
        grid = 72;
        break;
      }
      case "M": {
        grid = 77;
        break;
      }
      default: {
        return undefined;
      }
    }
    if (2 >= parts.len) {
      $panic();
    }
    const _bind$2 = _M0FP310monkeyfist2mf4core6digits(parts.buf[2], 1, 3);
    if (_bind$2 === undefined) {
      return undefined;
    } else {
      const _Some = _bind$2;
      const _min = _Some;
      if (3 >= parts.len) {
        $panic();
      }
      const _bind$3 = _M0FP310monkeyfist2mf4core6digits(parts.buf[3], 1, 3);
      if (_bind$3 === undefined) {
        return undefined;
      } else {
        const _Some$2 = _bind$3;
        const _max = _Some$2;
        if (4 >= parts.len) {
          $panic();
        }
        const _bind$4 = _M0FP310monkeyfist2mf4core6digits(parts.buf[4], 1, 2);
        if (_bind$4 === undefined) {
          return undefined;
        } else {
          const _Some$3 = _bind$4;
          const _w = _Some$3;
          if (5 >= parts.len) {
            $panic();
          }
          const _bind$5 = _M0FP310monkeyfist2mf4core6digits(parts.buf[5], 1, 2);
          if (_bind$5 === undefined) {
            return undefined;
          } else {
            const _Some$4 = _bind$5;
            const _h = _Some$4;
            if (6 >= parts.len) {
              $panic();
            }
            const _bind$6 = _M0FP310monkeyfist2mf4core6digits(parts.buf[6], 1, 3);
            if (_bind$6 === undefined) {
              return undefined;
            } else {
              const _Some$5 = _bind$6;
              const _count = _Some$5;
              if (7 >= parts.len) {
                $panic();
              }
              const f = parts.buf[7];
              if (!_M0MPC15array5Array8containsGsE(new _M0TPB5ArrayGsE(["N", "M", "S", "MS", "C", "MC", "SC", "MSC"], 8), f)) {
                return undefined;
              }
              if (8 >= parts.len) {
                $panic();
              }
              const seed = parts.buf[8];
              if (seed.length < 1 || seed.length > 12) {
                return undefined;
              }
              const _bind$7 = seed.length;
              let _tmp$2 = 0;
              while (true) {
                const i = _tmp$2;
                if (i < _bind$7) {
                  const c = i >>> 0 < seed.length ? seed.charCodeAt(i) : $oob();
                  if (!(c >= 48 && c <= 57 || c >= 65 && c <= 90)) {
                    return undefined;
                  }
                  _tmp$2 = i + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              const mirrors = _M0MPC16string6String8contains(f, _M0FP310monkeyfist2mf4core11parse__codeN6recordS6058);
              const springs = _M0MPC16string6String8contains(f, _M0FP310monkeyfist2mf4core11parse__codeN6recordS6059);
              const colossal = _M0MPC16string6String8contains(f, _M0FP310monkeyfist2mf4core11parse__codeN6recordS6060);
              const lo = mirrors || springs ? 8 : 4;
              const hi = colossal ? 48 : 24;
              if (_min < 1 || (_max > 100 || (_min > _max || (_w < lo || (_w > hi || (_h < lo || (_h > hi || (_count < 1 || _count > 200)))))))) {
                return undefined;
              }
              return new _M0TP310monkeyfist2mf4core7SetOpts(false, grid, _min, _max, _w, _h, _count, mirrors, springs, colossal, seed);
            }
          }
        }
      }
    }
  }
  function _M0FP310monkeyfist2mf4core11level__spec(o, index) {
    const _p = o.count - 1 | 0;
    const _p$2 = _p < index ? _p : index;
    const i = 0 > _p$2 ? 0 : _p$2;
    if (o.journey) {
      return i >>> 0 < _M0FP310monkeyfist2mf4core7journey.length ? _M0FP310monkeyfist2mf4core7journey[i] : $oob();
    }
    const _bind = o.grid;
    let hex;
    switch (_bind) {
      case 72: {
        hex = true;
        break;
      }
      case 83: {
        hex = false;
        break;
      }
      default: {
        hex = (i % 2 | 0) === 1;
      }
    }
    const _tmp = o.w;
    const _tmp$2 = o.h;
    const _tmp$3 = o.min + 0;
    const _tmp$4 = ((o.max - o.min | 0) + 0) * (i + 0);
    const _p$3 = o.count - 1 | 0;
    return new _M0TP310monkeyfist2mf4core4Spec(hex, _tmp, _tmp$2, _tmp$3 + _tmp$4 / ((1 > _p$3 ? 1 : _p$3) + 0), o.mirrors, o.springs, _M0MPC16string6String9to__upper(_M0FP310monkeyfist2mf4core6base36(_M0FP310monkeyfist2mf4core12hash__string(`grid/3/${_M0FP310monkeyfist2mf4core9set__code(o)}/${_M0MPC13int3Int18to__string_2einner(i, 10)}`))), false, 0, 0, o.colossal);
  }
  function _M0FP310monkeyfist2mf4core11layout__key(b) {
    const sb = _M0MPB13StringBuilder21StringBuilder_2einner(8);
    _M0IPB13StringBuilderPB6Logger13write__string(sb, b.hex ? "[\"hex\"," : "[\"square\",");
    const _string_builder = _M0MPB13StringBuilder21StringBuilder_2einner(3);
    _M0MPB13StringBuilder13write__objectGiE(_string_builder, b.w);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ",");
    _M0MPB13StringBuilder13write__objectGiE(_string_builder, b.h);
    _M0IPB13StringBuilderPB6Logger13write__string(_string_builder, ",[");
    _M0IPB13StringBuilderPB6Logger13write__string(sb, _string_builder.val);
    const _bind = b.ropes;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind$2) {
        const path = _bind$3[i];
        if (i > 0) {
          _M0IPB13StringBuilderPB6Logger11write__char(sb, 44);
        }
        _M0IPB13StringBuilderPB6Logger11write__char(sb, 91);
        const _bind$4 = path.len;
        const _bind$5 = path.buf;
        let _tmp$2 = 0;
        while (true) {
          const j = _tmp$2;
          if (j < _bind$4) {
            const p = _bind$5[j];
            if (j > 0) {
              _M0IPB13StringBuilderPB6Logger11write__char(sb, 44);
            }
            const _string_builder$2 = _M0MPB13StringBuilder21StringBuilder_2einner(3);
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, "[");
            _M0MPB13StringBuilder13write__objectGiE(_string_builder$2, p.q);
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, ",");
            _M0MPB13StringBuilder13write__objectGiE(_string_builder$2, p.r);
            _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, "]");
            _M0IPB13StringBuilderPB6Logger13write__string(sb, _string_builder$2.val);
            _tmp$2 = j + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _M0IPB13StringBuilderPB6Logger11write__char(sb, 93);
        _tmp = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0IPB13StringBuilderPB6Logger13write__string(sb, "],[");
    const _bind$4 = b.mirrors;
    const _bind$5 = _bind$4.len;
    const _bind$6 = _bind$4.buf;
    let _tmp$2 = 0;
    while (true) {
      const i = _tmp$2;
      if (i < _bind$5) {
        const m = _bind$6[i];
        if (i > 0) {
          _M0IPB13StringBuilderPB6Logger11write__char(sb, 44);
        }
        const kind = b.hex ? _M0MPC13int3Int18to__string_2einner(m.kind, 10) : m.kind === 0 ? "\"/\"" : "\"\\\\\"";
        const _string_builder$2 = _M0MPB13StringBuilder21StringBuilder_2einner(4);
        _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, "[");
        _M0MPB13StringBuilder13write__objectGiE(_string_builder$2, m.cell.q);
        _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, ",");
        _M0MPB13StringBuilder13write__objectGiE(_string_builder$2, m.cell.r);
        _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, ",");
        _M0MPB13StringBuilder13write__objectGsE(_string_builder$2, kind);
        _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, "]");
        _M0IPB13StringBuilderPB6Logger13write__string(sb, _string_builder$2.val);
        _tmp$2 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0IPB13StringBuilderPB6Logger13write__string(sb, "],[");
    const _bind$7 = b.springs;
    const _bind$8 = _bind$7.len;
    const _bind$9 = _bind$7.buf;
    let _tmp$3 = 0;
    while (true) {
      const i = _tmp$3;
      if (i < _bind$8) {
        const p = _bind$9[i];
        if (i > 0) {
          _M0IPB13StringBuilderPB6Logger11write__char(sb, 44);
        }
        const _string_builder$2 = _M0MPB13StringBuilder21StringBuilder_2einner(3);
        _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, "[");
        _M0MPB13StringBuilder13write__objectGiE(_string_builder$2, p.q);
        _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, ",");
        _M0MPB13StringBuilder13write__objectGiE(_string_builder$2, p.r);
        _M0IPB13StringBuilderPB6Logger13write__string(_string_builder$2, "]");
        _M0IPB13StringBuilderPB6Logger13write__string(sb, _string_builder$2.val);
        _tmp$3 = i + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0IPB13StringBuilderPB6Logger13write__string(sb, "]]");
    const data = sb.val;
    return `${_M0FP310monkeyfist2mf4core6base36(_M0FP310monkeyfist2mf4core12hash__string(data))}-${_M0FP310monkeyfist2mf4core6base36(_M0FP310monkeyfist2mf4core12hash__string(`layout:${data}`))}`;
  }
  function _M0FP310monkeyfist2mf4core14generate__spec(s) {
    const _bind = _M0FP310monkeyfist2mf4core14grid__generate(s);
    if (_bind === undefined) {
      return undefined;
    } else {
      const _Some = _bind;
      const _l = _Some;
      return new _M0TP310monkeyfist2mf4core5Level(_l.board, _l.par, _l.exact, _l.coverage, _l.wins, _l.challenge, _M0FP310monkeyfist2mf4core11layout__key(_l.board), _l.slides, _l.bounces, _l.repeated, _l.automatic, _l.used_mirrors, _l.used_springs, _l.manual_mirrors, _l.manual_springs);
    }
  }
  function _M0FP310monkeyfist2mf4core8generate(o, index) {
    return _M0FP310monkeyfist2mf4core14generate__spec(_M0FP310monkeyfist2mf4core11level__spec(o, index));
  }
  function _M0FP310monkeyfist2mf4core5guide(b, paths, budget, prefer) {
    const g = _M0MP310monkeyfist2mf4core5Board3geo(b);
    let current = paths;
    const moves = new _M0TPB5ArrayGiE([], 0);
    const _bind = prefer.len;
    const _bind$2 = prefer.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind) {
        const i = _bind$2[_];
        _L: {
          const _bind$3 = current;
          if (i < 0 || i >= _bind$3.len) {
            $panic();
          }
          const _bind$4 = _bind$3.buf[i];
          if (_bind$4 === undefined) {
            break _L;
          }
          const _bind$5 = _M0MP310monkeyfist2mf4core3Geo3tap(g, current, i);
          if (_bind$5 === undefined) {
            break;
          } else {
            const _Some = _bind$5;
            const _mv = _Some;
            _M0MPC15array5Array4pushGiE(moves, i);
            current = _mv.paths;
          }
          break _L;
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    if (_M0FP310monkeyfist2mf4core9all__gone(current)) {
      return new _M0TP310monkeyfist2mf4core6Solved(_M0FP310monkeyfist2mf4core5guideN6constrS6135, moves, 0);
    }
    return _M0MP310monkeyfist2mf4core5Board5solve(b, g, paths, budget, prefer);
  }
  function _M0FP310monkeyfist2mf4core19reachable__features(b, paths, budget) {
    const g = _M0MP310monkeyfist2mf4core5Board3geo(b);
    const _bind = [];
    const feature = _M0MPB3Map3MapGiiE(new _M0TPB9ArrayViewGUiiEE(_bind, 0, 0), undefined);
    const _bind$2 = b.mirrors;
    const _bind$3 = _bind$2.len;
    const _bind$4 = _bind$2.buf;
    let _tmp = 0;
    while (true) {
      const k = _tmp;
      if (k < _bind$3) {
        const m = _bind$4[k];
        _M0MPB3Map3setGiiE(feature, _M0MP310monkeyfist2mf4core3Geo4cell(g, m.cell), k);
        _tmp = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind$5 = b.springs;
    const _bind$6 = _bind$5.len;
    const _bind$7 = _bind$5.buf;
    let _tmp$2 = 0;
    while (true) {
      const k = _tmp$2;
      if (k < _bind$6) {
        const p = _bind$7[k];
        _M0MPB3Map3setGiiE(feature, _M0MP310monkeyfist2mf4core3Geo4cell(g, p), b.mirrors.len + k | 0);
        _tmp$2 = k + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const total = b.mirrors.len + b.springs.len | 0;
    let everything;
    if (total <= 0) {
      everything = new _M0TPB5ArrayGiE([], 0);
    } else {
      const _p = _M0MPC15array5Array20unsafe__make__uninitGiE(total);
      let _tmp$3 = 0;
      while (true) {
        const _p$2 = _tmp$3;
        if (_p$2 < total) {
          const _p$3 = _p$2;
          _p.buf[_p$2] = _p$3;
          _tmp$3 = _p$2 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      everything = _p;
    }
    if (total === 0) {
      return new _M0TPB5ArrayGiE([], 0);
    }
    const _bind$8 = [];
    const live = _M0MPB3Map3MapGibE(new _M0TPB9ArrayViewGUibEE(_bind$8, 0, 0), undefined);
    let visited = 0;
    const _bind$9 = paths.len;
    const _bind$10 = paths.buf;
    let _tmp$3 = 0;
    while (true) {
      const _ = _tmp$3;
      if (_ < _bind$9) {
        const original = _bind$10[_];
        _L: {
          if (original === undefined) {
            break _L;
          } else {
            const _Some = original;
            const _start = _Some;
            let path = _start;
            const _bind$11 = [];
            const seen = _M0MPC13set3Set3SetGsE(new _M0TPB9ArrayViewGsE(_bind$11, 0, 0), undefined);
            while (true) {
              if (visited >= budget) {
                return everything;
              }
              visited = visited + 1 | 0;
              const _p = path;
              const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGiE(_p.len);
              const _p$3 = _p.len;
              const _p$4 = _p.buf;
              let _tmp$4 = 0;
              while (true) {
                const _p$5 = _tmp$4;
                if (_p$5 < _p$3) {
                  const _p$6 = _p$4[_p$5];
                  const _p$7 = _M0MP310monkeyfist2mf4core3Geo4cell(g, _p$6);
                  _p$2.buf[_p$5] = _p$7;
                  _tmp$4 = _p$5 + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              const cells = _p$2;
              const _p$5 = _M0MPC15array5Array20unsafe__make__uninitGAiE(cells.len);
              const _p$6 = cells.len;
              const _p$7 = cells.buf;
              let _tmp$5 = 0;
              while (true) {
                const _p$8 = _tmp$5;
                if (_p$8 < _p$6) {
                  const _p$9 = _p$7[_p$8];
                  const _p$10 = _M0MPC13int3Int18to__string_2einner(_p$9, 10);
                  _p$5.buf[_p$8] = _p$10;
                  _tmp$5 = _p$8 + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              const state = _M0MPC15array5Array4joinGsE(_p$5, _M0FP310monkeyfist2mf4core19reachable__featuresN6recordS6154);
              if (_M0MPC13set3Set8containsGsE(seen, state)) {
                break;
              }
              _M0MPC13set3Set3addGsE(seen, state);
              const _bind$12 = path;
              const _bind$13 = path.len - 1 | 0;
              if (_bind$13 < 0 || _bind$13 >= _bind$12.len) {
                $panic();
              }
              const head = _bind$12.buf[_bind$13];
              const _bind$14 = path;
              const _bind$15 = path.len - 2 | 0;
              if (_bind$15 < 0 || _bind$15 >= _bind$14.len) {
                $panic();
              }
              const previous = _bind$14.buf[_bind$15];
              let dq = head.q - previous.q | 0;
              let dr = head.r - previous.r | 0;
              const _bind$16 = b.mirrors;
              const _bind$17 = _bind$16.len;
              const _bind$18 = _bind$16.buf;
              let _tmp$6 = 0;
              while (true) {
                const _$2 = _tmp$6;
                if (_$2 < _bind$17) {
                  const m = _bind$18[_$2];
                  if (m.cell.q === head.q && m.cell.r === head.r) {
                    _M0MPB3Map3setGibE(live, _M0MPB3Map2atGiiE(feature, _M0MP310monkeyfist2mf4core3Geo4cell(g, head)), true);
                    if (b.hex) {
                      const incoming = _M0FP310monkeyfist2mf4core15hex__dir__index(dq, dr);
                      const out = (((Math.imul(2, m.kind) | 0) - incoming | 0) + 6 | 0) % 6 | 0;
                      dq = out >>> 0 < _M0FP310monkeyfist2mf4core7hex__dq.length ? _M0FP310monkeyfist2mf4core7hex__dq[out] : $oob();
                      dr = out >>> 0 < _M0FP310monkeyfist2mf4core7hex__dr.length ? _M0FP310monkeyfist2mf4core7hex__dr[out] : $oob();
                    } else {
                      if (m.kind === 0) {
                        const t = dq;
                        dq = -dr | 0;
                        dr = -t | 0;
                      } else {
                        const t = dq;
                        dq = dr;
                        dr = t;
                      }
                    }
                    break;
                  }
                  _tmp$6 = _$2 + 1 | 0;
                  continue;
                } else {
                  break;
                }
              }
              const next = new _M0TP310monkeyfist2mf4core2Pt(head.q + dq | 0, head.r + dr | 0);
              if (!_M0MP310monkeyfist2mf4core3Geo6inside(g, next)) {
                break;
              }
              const at = _M0MP310monkeyfist2mf4core3Geo4cell(g, next);
              if (_M0MPC15array5Array8containsGiE(cells, at)) {
                break;
              }
              const _bind$19 = _M0MPB3Map3getGiiE(feature, at);
              if (_bind$19 === undefined) {
              } else {
                const _Some$2 = _bind$19;
                const _k = _Some$2;
                _M0MPB3Map3setGibE(live, _k, true);
              }
              if (live.size === total) {
                return everything;
              }
              const moved = _M0MPC15array9ArrayView9to__ownedGRP310monkeyfist2mf4core2PtE(_M0MPC15array5Array21clamped__view_2einnerGRP310monkeyfist2mf4core2PtE(path, 1, undefined));
              _M0MPC15array5Array4pushGUiiiRPB5ArrayGiEEE(moved, next);
              path = moved;
              const _bind$20 = _M0MPB3Map3getGiiE(feature, at);
              if (_bind$20 === undefined) {
              } else {
                const _Some$2 = _bind$20;
                const _k = _Some$2;
                if (_k >= b.mirrors.len) {
                  path = _M0MPC15array5Array3revGRP310monkeyfist2mf4core2PtE(path);
                }
              }
              continue;
            }
          }
          break _L;
        }
        _tmp$3 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    return _M0MPB4Iter9to__arrayGiE(_M0MPB3Map4keysGibE(live));
  }
  function _M0FP310monkeyfist2mf3gen9in__reset() {
    _M0MPC15array5Array5clearGiE(_M0FP310monkeyfist2mf3gen5input);
  }
  function _M0FP310monkeyfist2mf3gen8in__push(c) {
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen5input, c);
  }
  function _M0FP310monkeyfist2mf3gen8out__len() {
    return _M0FP310monkeyfist2mf3gen6output.len;
  }
  function _M0FP310monkeyfist2mf3gen8out__get(i) {
    if (i < 0 || i >= _M0FP310monkeyfist2mf3gen6output.len) {
      $panic();
    }
    return _M0FP310monkeyfist2mf3gen6output.buf[i];
  }
  function _M0FP310monkeyfist2mf3gen13input__string() {
    const _p = _M0MPC15array5Array20unsafe__make__uninitGcE(_M0FP310monkeyfist2mf3gen5input.len);
    const _p$2 = _M0FP310monkeyfist2mf3gen5input.len;
    const _p$3 = _M0FP310monkeyfist2mf3gen5input.buf;
    let _tmp = 0;
    while (true) {
      const _p$4 = _tmp;
      if (_p$4 < _p$2) {
        const _p$5 = _p$3[_p$4];
        const _p$6 = _p$5;
        _p.buf[_p$4] = _p$6;
        _tmp = _p$4 + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    const _bind = _p;
    return _M0MPC16string6String11from__array(new _M0TPB9ArrayViewGcE(_bind.buf, 0, _bind.len));
  }
  function _M0FP310monkeyfist2mf3gen11put__string(s) {
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, s.length);
    const _bind = s.length;
    let _tmp = 0;
    while (true) {
      const i = _tmp;
      if (i < _bind) {
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, i >>> 0 < s.length ? s.charCodeAt(i) : $oob());
        _tmp = i + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0FP310monkeyfist2mf3gen10put__level(l) {
    _M0MPC15array5Array5clearGiE(_M0FP310monkeyfist2mf3gen6output);
    const b = l.board;
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, b.hex ? 1 : 0);
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, b.w);
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, b.h);
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, l.par);
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, l.exact ? 1 : 0);
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, b.ropes.len);
    const _bind = b.ropes;
    const _bind$2 = _bind.len;
    const _bind$3 = _bind.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$2) {
        const p = _bind$3[_];
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, p.len);
        const _bind$4 = p.len;
        const _bind$5 = p.buf;
        let _tmp$2 = 0;
        while (true) {
          const _$2 = _tmp$2;
          if (_$2 < _bind$4) {
            const c = _bind$5[_$2];
            _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, c.q);
            _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, c.r);
            _tmp$2 = _$2 + 1 | 0;
            continue;
          } else {
            break;
          }
        }
        _tmp = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, b.mirrors.len);
    const _bind$4 = b.mirrors;
    const _bind$5 = _bind$4.len;
    const _bind$6 = _bind$4.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$5) {
        const m = _bind$6[_];
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, m.cell.q);
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, m.cell.r);
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, m.kind);
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, b.springs.len);
    const _bind$7 = b.springs;
    const _bind$8 = _bind$7.len;
    const _bind$9 = _bind$7.buf;
    let _tmp$3 = 0;
    while (true) {
      const _ = _tmp$3;
      if (_ < _bind$8) {
        const p = _bind$9[_];
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, p.q);
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, p.r);
        _tmp$3 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, b.plan.len);
    const _bind$10 = b.plan;
    const _bind$11 = _bind$10.len;
    const _bind$12 = _bind$10.buf;
    let _tmp$4 = 0;
    while (true) {
      const _ = _tmp$4;
      if (_ < _bind$11) {
        const i = _bind$12[_];
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, i);
        _tmp$4 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0FP310monkeyfist2mf3gen11put__string(l.layout_key);
    let _bind_buf = [l.slides, l.bounces, l.repeated, l.automatic, l.used_mirrors, l.used_springs, l.manual_mirrors, l.manual_springs];
    let _bind_len = 8;
    const _bind$13 = _bind_len;
    const _bind$14 = _bind_buf;
    let _tmp$5 = 0;
    while (true) {
      const _ = _tmp$5;
      if (_ < _bind$13) {
        const n = _bind$14[_];
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, n);
        _tmp$5 = _ + 1 | 0;
        continue;
      } else {
        break;
      }
    }
    _M0MPC15array5Array5clearGdE(_M0FP310monkeyfist2mf3gen9output__f);
    _M0MPC15array5Array4pushGdE(_M0FP310monkeyfist2mf3gen9output__f, l.wins);
    _M0MPC15array5Array4pushGdE(_M0FP310monkeyfist2mf3gen9output__f, l.challenge);
    _M0MPC15array5Array4pushGdE(_M0FP310monkeyfist2mf3gen9output__f, l.coverage);
    _M0FP310monkeyfist2mf3gen7current.val = l;
  }
  function _M0FP310monkeyfist2mf3gen9outf__get(i) {
    if (i < 0 || i >= _M0FP310monkeyfist2mf3gen9output__f.len) {
      $panic();
    }
    return _M0FP310monkeyfist2mf3gen9output__f.buf[i];
  }
  function _M0FP310monkeyfist2mf3gen3put(l) {
    if (l === undefined) {
      return 0;
    } else {
      const _Some = l;
      const _l = _Some;
      _M0FP310monkeyfist2mf3gen10put__level(_l);
      return 1;
    }
  }
  function _M0FP310monkeyfist2mf3gen8generate(index) {
    const _bind = _M0FP310monkeyfist2mf4core11parse__code(_M0FP310monkeyfist2mf3gen13input__string());
    if (_bind === undefined) {
      return 0;
    } else {
      const _Some = _bind;
      const _o = _Some;
      return _M0FP310monkeyfist2mf3gen3put(_M0FP310monkeyfist2mf4core8generate(_o, index));
    }
  }
  function _M0FP310monkeyfist2mf3gen14generate__spec(hex, w, h, difficulty, mirrors, springs, require_slide, min_mirrors, min_springs, colossal) {
    return _M0FP310monkeyfist2mf3gen3put(_M0FP310monkeyfist2mf4core14generate__spec(new _M0TP310monkeyfist2mf4core4Spec(hex === 1, w, h, difficulty, mirrors === 1, springs === 1, _M0FP310monkeyfist2mf3gen13input__string(), require_slide === 1, min_mirrors, min_springs, colossal === 1)));
  }
  function _M0FP310monkeyfist2mf3gen7measure(games) {
    const _bind = _M0FP310monkeyfist2mf3gen7current.val;
    if (_bind === undefined) {
      return -1;
    } else {
      const _Some = _bind;
      const _l = _Some;
      return _M0FP310monkeyfist2mf4core15casual__measure(_l.board, _M0FP310monkeyfist2mf3gen13input__string(), games);
    }
  }
  function _M0FP310monkeyfist2mf3gen17target__challenge(d) {
    return _M0FP310monkeyfist2mf4core17target__challenge(d);
  }
  function _M0FP310monkeyfist2mf3gen12win__ceiling(d) {
    return _M0FP310monkeyfist2mf4core12win__ceiling(d);
  }
  function _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k) {
    k.val = k.val + 1 | 0;
    const _bind = k.val - 1 | 0;
    if (_bind < 0 || _bind >= _M0FP310monkeyfist2mf3gen5input.len) {
      $panic();
    }
    return _M0FP310monkeyfist2mf3gen5input.buf[_bind];
  }
  function _M0FP310monkeyfist2mf3gen14read__positionN5cellsS6293(k) {
    const _p = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
    if (_p <= 0) {
      return new _M0TPB5ArrayGRP310monkeyfist2mf4core2PtE([], 0);
    } else {
      const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p);
      let _tmp = 0;
      while (true) {
        const _p$3 = _tmp;
        if (_p$3 < _p) {
          const _p$4 = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
          const _p$5 = new _M0TP310monkeyfist2mf4core2Pt(_p$4, _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k));
          _p$2.buf[_p$3] = _p$5;
          _tmp = _p$3 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      return _p$2;
    }
  }
  function _M0FP310monkeyfist2mf3gen14read__position() {
    const k = new _M0TPB8MutLocalGiE(0);
    const hex = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k) === 1;
    const w = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
    const h = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
    const _p = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
    let ropes;
    if (_p <= 0) {
      ropes = new _M0TPB5ArrayGRPB5ArrayGRP310monkeyfist2mf4core2PtEE([], 0);
    } else {
      const _p$2 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p);
      let _tmp = 0;
      while (true) {
        const _p$3 = _tmp;
        if (_p$3 < _p) {
          const _p$4 = _M0FP310monkeyfist2mf3gen14read__positionN5cellsS6293(k);
          _p$2.buf[_p$3] = _p$4;
          _tmp = _p$3 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      ropes = _p$2;
    }
    const _p$2 = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
    let mirrors;
    if (_p$2 <= 0) {
      mirrors = new _M0TPB5ArrayGRP310monkeyfist2mf4core6MirrorE([], 0);
    } else {
      const _p$3 = _M0MPC15array5Array20unsafe__make__uninitGAiE(_p$2);
      let _tmp = 0;
      while (true) {
        const _p$4 = _tmp;
        if (_p$4 < _p$2) {
          const _p$5 = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
          const _p$6 = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
          const _p$7 = new _M0TP310monkeyfist2mf4core6Mirror(new _M0TP310monkeyfist2mf4core2Pt(_p$5, _p$6), _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k));
          _p$3.buf[_p$4] = _p$7;
          _tmp = _p$4 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      mirrors = _p$3;
    }
    const springs = _M0FP310monkeyfist2mf3gen14read__positionN5cellsS6293(k);
    const _p$3 = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
    let paths;
    if (_p$3 <= 0) {
      paths = new _M0TPB5ArrayGORPB5ArrayGRP310monkeyfist2mf4core2PtEE([], 0);
    } else {
      const _p$4 = _M0MPC15array5Array20unsafe__make__uninitGORP310monkeyfist2mf4core4SnapE(_p$3);
      let _tmp = 0;
      while (true) {
        const _p$5 = _tmp;
        if (_p$5 < _p$3) {
          const _p$6 = _M0FP310monkeyfist2mf3gen14read__positionN5cellsS6293(k);
          const _p$7 = _p$6.len === 0 ? undefined : _p$6;
          _p$4.buf[_p$5] = _p$7;
          _tmp = _p$5 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      paths = _p$4;
    }
    const _p$4 = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
    let prefer;
    if (_p$4 <= 0) {
      prefer = new _M0TPB5ArrayGiE([], 0);
    } else {
      const _p$5 = _M0MPC15array5Array20unsafe__make__uninitGiE(_p$4);
      let _tmp = 0;
      while (true) {
        const _p$6 = _tmp;
        if (_p$6 < _p$4) {
          const _p$7 = _M0FP310monkeyfist2mf3gen14read__positionN4nextS6292(k);
          _p$5.buf[_p$6] = _p$7;
          _tmp = _p$6 + 1 | 0;
          continue;
        } else {
          break;
        }
      }
      prefer = _p$5;
    }
    return { _0: new _M0TP310monkeyfist2mf4core5Board(hex, w, h, ropes, mirrors, springs, new _M0TPB5ArrayGiE([], 0)), _1: paths, _2: prefer };
  }
  function _M0FP310monkeyfist2mf3gen5guide(budget) {
    const _bind = _M0FP310monkeyfist2mf3gen14read__position();
    const _b = _bind._0;
    const _paths = _bind._1;
    const _prefer = _bind._2;
    const s = _M0FP310monkeyfist2mf4core5guide(_b, _paths, budget, _prefer);
    _M0MPC15array5Array5clearGiE(_M0FP310monkeyfist2mf3gen6output);
    const _bind$2 = s.solved;
    let _tmp;
    if (_bind$2 === -1) {
      _tmp = -1;
    } else {
      const _Some = _bind$2;
      const _x = _Some;
      if (_x === true) {
        _tmp = 1;
      } else {
        _tmp = 0;
      }
    }
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, _tmp);
    _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, s.nodes);
    const _bind$3 = s.moves;
    const _bind$4 = _bind$3.len;
    const _bind$5 = _bind$3.buf;
    let _tmp$2 = 0;
    while (true) {
      const _ = _tmp$2;
      if (_ < _bind$4) {
        const m = _bind$5[_];
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, m);
        _tmp$2 = _ + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  function _M0FP310monkeyfist2mf3gen8features(budget) {
    const _bind = _M0FP310monkeyfist2mf3gen14read__position();
    const _b = _bind._0;
    const _paths = _bind._1;
    _M0MPC15array5Array5clearGiE(_M0FP310monkeyfist2mf3gen6output);
    const _bind$2 = _M0FP310monkeyfist2mf4core19reachable__features(_b, _paths, budget);
    const _bind$3 = _bind$2.len;
    const _bind$4 = _bind$2.buf;
    let _tmp = 0;
    while (true) {
      const _ = _tmp;
      if (_ < _bind$3) {
        const i = _bind$4[_];
        _M0MPC15array5Array4pushGiE(_M0FP310monkeyfist2mf3gen6output, i);
        _tmp = _ + 1 | 0;
        continue;
      } else {
        return;
      }
    }
  }
  (globalThis.MFCore ||= {}).in_reset = _M0FP310monkeyfist2mf3gen9in__reset;
  (globalThis.MFCore ||= {}).in_push = _M0FP310monkeyfist2mf3gen8in__push;
  (globalThis.MFCore ||= {}).out_len = _M0FP310monkeyfist2mf3gen8out__len;
  (globalThis.MFCore ||= {}).out_get = _M0FP310monkeyfist2mf3gen8out__get;
  (globalThis.MFCore ||= {}).outf_get = _M0FP310monkeyfist2mf3gen9outf__get;
  (globalThis.MFCore ||= {}).generate = _M0FP310monkeyfist2mf3gen8generate;
  (globalThis.MFCore ||= {}).generate_spec = _M0FP310monkeyfist2mf3gen14generate__spec;
  (globalThis.MFCore ||= {}).measure = _M0FP310monkeyfist2mf3gen7measure;
  (globalThis.MFCore ||= {}).target_challenge = _M0FP310monkeyfist2mf3gen17target__challenge;
  (globalThis.MFCore ||= {}).win_ceiling = _M0FP310monkeyfist2mf3gen12win__ceiling;
  (globalThis.MFCore ||= {}).guide = _M0FP310monkeyfist2mf3gen5guide;
  (globalThis.MFCore ||= {}).features = _M0FP310monkeyfist2mf3gen8features;
})();
