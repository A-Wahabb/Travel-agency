import SocketService from './socketService';

let socketServiceInstance: SocketService | null = null;

export function setSocketService(service: SocketService): void {
    socketServiceInstance = service;
}

export function getSocketService(): SocketService | null {
    return socketServiceInstance;
}


