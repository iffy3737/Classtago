class EdunixoPCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'push' && data.samples) {
        this.queue.push(new Float32Array(data.samples));
      } else if (data.type === 'flush') {
        this.queue = [];
        this.offset = 0;
      }
    };
  }

  process(_inputs, outputs) {
    const channel = outputs?.[0]?.[0];
    if (!channel) return true;
    channel.fill(0);
    let written = 0;

    while (written < channel.length && this.queue.length) {
      const head = this.queue[0];
      const available = head.length - this.offset;
      const needed = channel.length - written;
      const take = Math.min(available, needed);
      channel.set(head.subarray(this.offset, this.offset + take), written);
      written += take;
      this.offset += take;
      if (this.offset >= head.length) {
        this.queue.shift();
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('edunixo-pcm-player', EdunixoPCMPlayerProcessor);
