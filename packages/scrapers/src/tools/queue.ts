interface QueueItem<T> {
  task: () => Promise<T> | T;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export class TaskQueue {
  private queue: QueueItem<any>[];
  private running: number;
  private results: any[];

  constructor(public concurrency = 10) {
    this.queue = [];
    this.running = 0;
    this.results = [];
  }

  add<T>(task: () => Promise<T> | T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject,
      });
      this.run();
    });
  }

  private run(): void {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const { task, resolve, reject } = this.queue.shift()!;
    this.running++;

    Promise.resolve(task())
      .then((result) => {
        this.running--;
        resolve(result);
        this.run();
        return result;
      })
      .catch((error) => {
        this.running--;
        reject(error);
        this.run();
      });
  }

  addAll<T>(tasks: Array<() => Promise<T> | T>): Promise<T[]> {
    return Promise.all(tasks.map((task) => this.add(task)));
  }
}
