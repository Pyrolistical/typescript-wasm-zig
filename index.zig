const std = @import("std");
const builtin = std.builtin;
const math = std.math;
const allocator = std.heap.page_allocator;

const env = @import("env.zig");

const Person = extern struct {
    name: [*:0]const u8,
    gpa: f32,
};

export fn sendPerson(person: *Person) void {
    defer allocator.destroy(person);
    defer allocator.free(std.mem.span(person.name));

    env.consoleLog("From TS in Zig: {s} has a GPA of {d:.1}", .{
        person.name,
        person.gpa,
    });
}

export fn receivePerson() *Person {
    var alice = allocator.create(Person) catch
        @panic("failed to allocate Person");
    alice.name = allocator.dupeZ(u8, "Alice") catch
        @panic("failed to allocate Alice name");
    alice.gpa = 4.0;
    return alice;
}

// Calls to @panic are sent here.
// See https://ziglang.org/documentation/master/#panic
pub fn panic(message: []const u8, _: ?*builtin.StackTrace, _: ?usize) noreturn {
    env.throwError(message);
}

export fn allocUint8(length: u32) [*]const u8 {
    const slice = allocator.alloc(u8, length) catch
        @panic("failed to allocate memory");
    return slice.ptr;
}

export fn free(pointer: u32, length: u32) void {
    const slice = @intToPtr([*]u8, pointer);
    return allocator.free(slice[0..length]);
}

export fn destoryPerson(pointer: u32) void {
    destroy(Person, pointer);
}

// can't export this directly
fn destroy(comptime T: type, pointer: u32) void {
    allocator.destroy(@intToPtr(*T, pointer));
}
