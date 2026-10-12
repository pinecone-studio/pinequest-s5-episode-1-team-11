import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSoundRunner, normalized } from "./sound-runner";

const model = vi.hoisted(() => ({
  classify: vi.fn(),
  close: vi.fn(),
  create: vi.fn(),
  files: vi.fn(),
}));
vi.mock("@mediapipe/tasks-audio", () => ({
  AudioClassifier: { createFromOptions: model.create },
  FilesetResolver: { forAudioTasks: model.files },
}));

type Processor = {
  port: { onmessage: ((event: { data: unknown }) => void) | null };
  process(inputs: Float32Array[][]): boolean;
};

class AudioNodeStub extends EventTarget {
  connect = vi.fn((destination: AudioNodeStub) => destination);
  disconnect = vi.fn();
}

class ContextStub extends EventTarget {
  static instances: ContextStub[] = [];
  state: AudioContextState = "suspended";
  sampleRate = 16_000;
  currentTime = 0;
  source = new AudioNodeStub();
  gain = Object.assign(new AudioNodeStub(), { gain: { value: 1 } });
  destination = new AudioNodeStub();
  processorFactory!: (post: (data: unknown) => void) => Processor;
  render!: (processor: Processor, inputs: Float32Array[][], time: number) => void;
  moduleFailure: Error | null = null;
  audioWorklet = {
    addModule: vi.fn(async () => {
      if (this.moduleFailure) throw this.moduleFailure;
      const text = await workletBlob.text();
      const compile = new Function(
        "AudioWorkletProcessor",
        "registerProcessor",
        "sampleRate",
        `let currentTime = 0; ${text}; return (processor, inputs, time) => {
          currentTime = time; processor.process(inputs);
        };`,
      );
      class ProcessorBase {
        port = { onmessage: null, postMessage: (_data: unknown) => {} };
      }
      this.render = compile(
        ProcessorBase,
        (_name: string, Constructor: new () => Processor) => {
          this.processorFactory = (post) => {
            const processor = new Constructor();
            Object.assign(processor.port, { postMessage: post });
            return processor;
          };
        },
        this.sampleRate,
      );
    }),
  };
  resume = vi.fn(async () => {
    this.setState("running");
  });
  close = vi.fn(async () => {
    this.setState("closed");
  });
  createMediaStreamSource = vi.fn(() => this.source);
  createGain = vi.fn(() => this.gain);
  constructor() {
    super();
    ContextStub.instances.push(this);
  }
  setState(state: AudioContextState) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

class WorkletStub extends AudioNodeStub {
  static instances: WorkletStub[] = [];
  port = {
    onmessage: null as ((event: { data: unknown }) => void) | null,
    postMessage: vi.fn((data: unknown) => this.processor.port.onmessage?.({ data })),
    close: vi.fn(),
  };
  processor: Processor;
  constructor(
    private context: ContextStub,
    _name: string,
    readonly options?: AudioWorkletNodeOptions,
  ) {
    super();
    this.processor = context.processorFactory((data) => this.port.onmessage?.({ data }));
    WorkletStub.instances.push(this);
  }
  samples(data: Float32Array) {
    this.context.render(this.processor, [[data]], this.context.currentTime);
    this.context.currentTime += data.length / this.context.sampleRate;
  }
}

let workletBlob: Blob;
let track: EventTarget & { readyState: string; muted: boolean };
let stream: MediaStream;

describe("microphone sound runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ContextStub.instances = [];
    WorkletStub.instances = [];
    model.files.mockResolvedValue({});
    model.create.mockResolvedValue({ classify: model.classify, close: model.close });
    model.classify.mockReturnValue([
      { classifications: [{ categories: [{ categoryName: "Screaming", score: 0.8 }] }] },
    ]);
    vi.stubGlobal("AudioContext", ContextStub);
    vi.stubGlobal("AudioWorkletNode", WorkletStub);
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      workletBlob = blob as Blob;
      return "blob:microphone-tap";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    track = Object.assign(new EventTarget(), { readyState: "live", muted: false });
    stream = { getAudioTracks: () => [track] } as unknown as MediaStream;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("unlocks audio before model loading and returns even when resume awaits a phone gesture", async () => {
    const resume = vi.fn(() => new Promise<void>(() => {}));
    class LockedContext extends ContextStub {
      override resume = resume;
    }
    vi.stubGlobal("AudioContext", LockedContext);
    const onState = vi.fn();

    const starting = createSoundRunner(stream, vi.fn(), { onState });
    expect(resume).toHaveBeenCalledOnce();
    const runner = await starting;
    expect(onState).toHaveBeenLastCalledWith("suspended");
    await runner.close();
  });

  it("classifies complete mono PCM windows without posting every render block", async () => {
    const onScores = vi.fn();
    const runner = await createSoundRunner(stream, onScores);
    const context = ContextStub.instances[0];
    const tap = WorkletStub.instances[0];
    const samples = new Float32Array(23_600).fill(0.25);
    // YAMNet needs 15,600 samples at 16 kHz; another result follows 8,000 samples later.
    for (let offset = 0; offset < 15_599; offset += 127) {
      tap.samples(samples.subarray(offset, Math.min(15_599, offset + 127)));
    }
    expect(model.classify).not.toHaveBeenCalled();
    tap.samples(samples.subarray(15_599, 15_600));
    expect(model.classify).toHaveBeenCalledOnce();
    expect(model.classify.mock.calls[0][0]).toEqual(new Float32Array(15_600).fill(0.25));
    expect(model.classify.mock.calls[0][1]).toBe(16_000);
    expect(onScores.mock.calls[0][1]).toEqual({ scream: 0.8, cry: 0, glass: 0, alarm: 0 });
    expect(onScores.mock.calls[0][2]).toBe(0.25);
    for (let offset = 15_600; offset < samples.length; offset += 128) {
      tap.samples(samples.subarray(offset, offset + 128));
    }
    expect(model.classify).toHaveBeenCalledTimes(2);
    expect(tap.options).toMatchObject({ channelCount: 1, channelCountMode: "explicit" });
    await runner.close();
    expect(context.close).toHaveBeenCalledOnce();
    expect(model.close).toHaveBeenCalledOnce();
  });

  it("does not combine pre-interruption audio with a resumed microphone", async () => {
    const onState = vi.fn();
    const runner = await createSoundRunner(stream, vi.fn(), { onState });
    const context = ContextStub.instances[0];
    const tap = WorkletStub.instances[0];
    tap.samples(new Float32Array(15_000).fill(0.8));
    context.setState("suspended");
    expect(onState).toHaveBeenLastCalledWith("suspended");
    await runner.resume();
    expect(onState).toHaveBeenLastCalledWith("running");
    tap.samples(new Float32Array(1000).fill(0.1));
    expect(model.classify).not.toHaveBeenCalled();
    tap.samples(new Float32Array(14_600).fill(0.1));
    expect(model.classify.mock.calls[0][0]).toEqual(new Float32Array(15_600).fill(0.1));
    await runner.close();
  });

  it.each([44_100, 48_000])(
    "keeps the device's %i Hz PCM rate and correct window order",
    async (rate) => {
      class NativeContext extends ContextStub {
        override sampleRate = rate;
      }
      vi.stubGlobal("AudioContext", NativeContext);
      const runner = await createSoundRunner(stream, vi.fn());
      const tap = WorkletStub.instances[0];
      const length = Math.round(rate * 0.975);
      const hop = rate / 2;
      const samples = Float32Array.from({ length: length + hop }, (_, i) => i / (length + hop));

      for (let offset = 0; offset < samples.length; offset += 128) {
        tap.samples(samples.subarray(offset, offset + 128));
      }

      expect(model.classify).toHaveBeenCalledTimes(2);
      expect(model.classify.mock.calls[0]).toEqual([samples.slice(0, length), rate]);
      expect(model.classify.mock.calls[1]).toEqual([samples.slice(hop), rate]);
      await runner.close();
    },
  );

  it("discards queued pre-interruption windows and resumes with fresh audio", async () => {
    const runner = await createSoundRunner(stream, vi.fn());
    const context = ContextStub.instances[0];
    const tap = WorkletStub.instances[0];
    const deliver = tap.port.onmessage;
    const queued: unknown[] = [];
    tap.port.onmessage = ({ data }) => queued.push(data);
    tap.samples(new Float32Array(15_600).fill(0.8));
    context.setState("suspended");
    await runner.resume();
    tap.port.onmessage = deliver;

    deliver?.({ data: queued[0] });
    expect(model.classify).not.toHaveBeenCalled();
    tap.samples(new Float32Array(15_600).fill(0.1));
    expect(model.classify.mock.calls[0][0]).toEqual(new Float32Array(15_600).fill(0.1));
    await runner.close();
  });

  it("discards stale queued audio after a long UI stall", async () => {
    const runner = await createSoundRunner(stream, vi.fn());
    const context = ContextStub.instances[0];
    const tap = WorkletStub.instances[0];
    const deliver = tap.port.onmessage;
    const queued: unknown[] = [];
    tap.port.onmessage = ({ data }) => queued.push(data);
    tap.samples(new Float32Array(15_600).fill(0.8));
    context.currentTime += 2;

    deliver?.({ data: queued[0] });
    expect(model.classify).not.toHaveBeenCalled();
    await runner.close();
  });

  it("reports a muted or disconnected microphone instead of claiming audio is active", async () => {
    const onState = vi.fn();
    const onError = vi.fn();
    const runner = await createSoundRunner(stream, vi.fn(), { onState, onError });
    expect(onState).toHaveBeenLastCalledWith("running");
    track.muted = true;
    track.dispatchEvent(new Event("mute"));
    expect(onState).toHaveBeenLastCalledWith("suspended");
    track.muted = false;
    track.dispatchEvent(new Event("unmute"));
    expect(onState).toHaveBeenLastCalledWith("running");
    track.readyState = "ended";
    track.dispatchEvent(new Event("ended"));
    expect(onState).toHaveBeenLastCalledWith("suspended");
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    await runner.close();
    expect(model.close).toHaveBeenCalledOnce();
  });

  it("releases a model loaded after the microphone disconnects during initialization", async () => {
    let finish!: (classifier: unknown) => void;
    model.create.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const onState = vi.fn();
    const starting = createSoundRunner(stream, vi.fn(), { onState });
    await vi.waitFor(() => expect(model.create).toHaveBeenCalledOnce());
    expect(onState).not.toHaveBeenCalled();
    track.readyState = "ended";
    track.dispatchEvent(new Event("ended"));
    finish({ classify: model.classify, close: model.close });

    await expect(starting).rejects.toThrow("microphone disconnected");
    expect(model.close).toHaveBeenCalledOnce();
    expect(ContextStub.instances[0].close).toHaveBeenCalledOnce();
    expect(WorkletStub.instances).toHaveLength(0);
  });

  it("closes both the model and context if worklet initialization fails", async () => {
    const error = new Error("Worklet could not load");
    class FailedContext extends ContextStub {
      override moduleFailure = error;
    }
    vi.stubGlobal("AudioContext", FailedContext);

    await expect(createSoundRunner(stream, vi.fn())).rejects.toBe(error);

    expect(ContextStub.instances[0].close).toHaveBeenCalledOnce();
    expect(model.close).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:microphone-tap");
  });

  it("reports inference failures and stops classification instead of silently dying", async () => {
    const error = new Error("Audio inference failed");
    model.classify.mockImplementation(() => {
      throw error;
    });
    const onError = vi.fn();
    const runner = await createSoundRunner(stream, vi.fn(), { onError });
    const tap = WorkletStub.instances[0];

    tap.samples(new Float32Array(15_600).fill(0.25));
    expect(onError).toHaveBeenCalledWith(error);
    tap.samples(new Float32Array(8000).fill(0.25));
    expect(model.classify).toHaveBeenCalledOnce();
    await runner.close();
    expect(model.close).toHaveBeenCalledOnce();
  });
});

describe("normalized", () => {
  const rms = (x: Float32Array) => Math.sqrt(x.reduce((sum, v) => sum + v * v, 0) / x.length);
  const tone = (amplitude: number) =>
    Float32Array.from({ length: 1600 }, (_, i) => amplitude * Math.sin(i / 5));

  it("raises a distant sound to the level the classifier expects", () => {
    expect(rms(normalized(tone(0.01)))).toBeCloseTo(0.1, 2);
  });

  it("leaves silence and loud sounds untouched", () => {
    const silence = tone(0.0001);
    const loud = tone(0.5);
    expect(normalized(silence)).toBe(silence);
    expect(normalized(loud)).toBe(loud);
  });
});
