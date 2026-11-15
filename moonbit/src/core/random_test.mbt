// Values from random.js and V8 (node): the primitives must match bit for bit.

///|
test "hash_string and mulberry32 match random.js" {
  assert_eq(@core.hash_string("grid/3/1E36ZS5"), 2737516719U)
  let r = @core.rng_of("grid/3/1E36ZS5")
  assert_eq(r.next(), 0.254515414359048)
  assert_eq(r.next(), 0.8429008759558201)
  assert_eq(r.next(), 0.3264201944693923)
}

///|
test "base36 matches Number.prototype.toString(36)" {
  assert_eq(@core.base36(4294967295U), "1z141z3")
  assert_eq(@core.base36(@core.hash_string("")), "ztntfp")
  assert_eq(@core.base36(0U), "0")
}

///|
test "to_fixed matches Number(x.toFixed(4))" {
  assert_eq(@core.to_fixed(1.23456, 4), 1.2346)
  assert_eq(@core.to_fixed(2.71828, 4), 2.7183)
}

///|
test "pow matches V8's Math.pow on generator inputs" {
  assert_eq(@math.pow(0.205, 1.3), 0.1274324460373689)
  assert_eq(300.0 * @math.pow(0.5, 1.3), 121.83785945343531)
}

///|
test "js_round and floor_div follow Math.round and Math.floor" {
  assert_eq(@core.js_round(2.5), 3)
  assert_eq(@core.js_round(-2.5), -2)
  assert_eq(@core.floor_div(-1, 2), -1)
  assert_eq(@core.floor_div(-4, 2), -2)
}
