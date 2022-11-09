const std = @import("std");
const builtin = std.builtin;
const math = std.math;
const allocator = std.heap.page_allocator;

const env = @import("env.zig");

const ExternPerson = extern struct {
    name: [*:0]const u8,
    gpa: f32,
};

const Person = struct {
    name: []const u8,
    gpa: f32,
};

export fn _sendPersonFromTS(person_pointer: *ExternPerson) void {
    defer allocator.free(@ptrCast([*]ExternPerson, person_pointer)[0..1]);
    defer allocator.free(person_pointer.name[0..std.mem.len(person_pointer.name)]);
    const person = Person{
        .name = std.mem.span(person_pointer.name),
        .gpa = person_pointer.gpa,
    };
    env.consoleLog("{s} has a GPA of {d:.1}", .{ person.name, person.gpa });
}

export fn start() void {
    const name: [:0]const u8 = "Alice";
    const alice = ExternPerson{
        .name = name.ptr,
        .gpa = 4.0,
    };
    receivePersonFromZig(&alice);
}
extern "app" fn receivePersonFromZig(person_pointer: *const ExternPerson) void;

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

export fn free(pointer: [*:0]u8) void {
    allocator.free(std.mem.span(pointer));
}
