import indexWasmUrl from "./index.wasm?url";

type Person = {
	name: string;
	gpa: number;
};

const module = await WebAssembly.compileStreaming(fetch(indexWasmUrl));

const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
const sizeOfNullByte = Uint8Array.BYTES_PER_ELEMENT;
const sizeOfFloat32 = Float32Array.BYTES_PER_ELEMENT;

const decodeNullTerminatedString = (pointer: number) => {
	const slice = new Uint8Array(memory.buffer, pointer);
	const length = slice.findIndex((value: number) => value === 0);
	return decodeString(pointer, length);
};

const decodeString = (pointer: number, length: number) => {
	const slice = new Uint8Array(memory.buffer, pointer, length);
	return new TextDecoder().decode(slice);
};

const encodeNullTerminatedString = (string: string) => {
	const buffer = new TextEncoder().encode(string);
	const pointer = allocUint8(buffer.length + 1);
	const slice = new Uint8Array(
		memory.buffer,
		pointer,
		buffer.length + sizeOfNullByte
	);
	slice.set(buffer);
	slice[buffer.length] = 0;
	return pointer;
};

const decodePerson = (personPointer: number): Person => {
	const namePointerSlice = new Uint32Array(memory.buffer, personPointer);

	const name = decodeNullTerminatedString(namePointerSlice[0]!);

	const gpaSlice = new Float32Array(
		memory.buffer,
		personPointer + sizeOfUint32,
		1
	);
	const gpa = gpaSlice[0]!;

	return { name, gpa };
};

const encodePerson = ({ name, gpa }: Person) => {
	const namePointer = encodeNullTerminatedString(name);
	const personPointer = allocUint8(sizeOfUint32 + sizeOfFloat32);

	const namePointerSlice = new Uint32Array(memory.buffer, personPointer, 1);
	namePointerSlice[0] = namePointer;

	const gpaSlice = new Float32Array(
		memory.buffer,
		personPointer + sizeOfUint32,
		1
	);
	gpaSlice[0] = gpa;

	return personPointer;
};

const { exports } = await WebAssembly.instantiate(module, {
	app: {
		receivePersonFromZig(personPointer: number) {
			console.log("Received", decodePerson(personPointer), "from Zig");
		},
	},
	env: {
		_throwError(pointer: number, length: number) {
			const message = decodeString(pointer, length);
			throw new Error(message);
		},
		_consoleLog(pointer: number, length: number) {
			const message = decodeString(pointer, length);
			console.log(message);
		},
	},
});

const { memory, _sendPersonFromTS, allocUint8, start } = exports as {
	memory: WebAssembly.Memory;
	_sendPersonFromTS(personPointer: number): void;
	allocUint8(length: number): number;
	start(): void;
};

_sendPersonFromTS(
	encodePerson({
		name: "Bob",
		gpa: 3.6,
	})
);

start();
