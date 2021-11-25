import Worker from 'web-worker';

export async function createWorker(url: string) {
    const workerScript = await fetch(url, {
        mode: 'cors',
    });
    const workerURL = URL.createObjectURL(await workerScript.blob());
    return new Worker(workerURL);
}
