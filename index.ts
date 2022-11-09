import indexWasmUrl from "./index.wasm?url";

const module = await WebAssembly.compileStreaming(fetch(indexWasmUrl));

const { exports } = await WebAssembly.instantiate(module, {
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

const { memory, sendPerson, receivePerson, allocUint8, free, destoryPerson } =
	exports as {
		memory: WebAssembly.Memory;
		sendPerson(personPointer: number): void;
		receivePerson(): number;
		allocUint8(length: number): number;
		free(pointer: number, length: number): void;
		destoryPerson(pointer: number): void;
	};

const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
const sizeOfNullByte = Uint8Array.BYTES_PER_ELEMENT;
const sizeOfFloat32 = Float32Array.BYTES_PER_ELEMENT;

const decodeNullTerminatedString = (pointer: number) => {
	const slice = new Uint8Array(memory.buffer, pointer);
	const length = slice.findIndex((value: number) => value === 0);
	try {
		return decodeString(pointer, length);
	} finally {
		free(pointer, length);
	}
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
	try {
		const namePointerSlice = new Uint32Array(memory.buffer, personPointer, 1);

		const namePointer = namePointerSlice[0]!;
		const name = decodeNullTerminatedString(namePointer);

		const gpaSlice = new Float32Array(
			memory.buffer,
			personPointer + sizeOfUint32,
			1
		);
		const gpa = gpaSlice[0]!;

		return { name, gpa };
	} finally {
		destoryPerson(personPointer);
	}
};

const encodePerson = ({ name, gpa }: Person) => {
	const personPointer = allocUint8(sizeOfUint32 + sizeOfFloat32);

	const namePointer = encodeNullTerminatedString(name);
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

type Person = {
	name: string;
	gpa: number;
};

const bob = {
	name: "Bob",
	gpa: 3.6,
};
const bobPointer = encodePerson(bob);
sendPerson(bobPointer);

const alicePointer = receivePerson();
const alice = decodePerson(alicePointer);
console.log(`From Zig in TS: ${alice.name} has a GPA of ${alice.gpa}`);
