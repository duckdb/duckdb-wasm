import Worker from 'web-worker';

export async function createWorker(url: string) {
    const request = new Request(url);
    const workerScript = await fetch(request);
    const workerURL = URL.createObjectURL(await workerScript.blob());
    return new Worker(workerURL);
}
