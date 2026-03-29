import { Socket } from 'socket.io';
interface CallData {
    from: string;
    to: string;
    callId: string;
    callerName: string;
}
declare class AgentProxyService {
    private activeProxies;
    private baseAgentUrl;
    setAgentServerUrl(url: string): void;
    createProxy(clientSocket: Socket, callData: CallData): Promise<void>;
    closeProxy(callId: string): void;
    isProxyActive(callId: string): boolean;
}
declare const _default: AgentProxyService;
export default _default;
//# sourceMappingURL=AgentProxyService.d.ts.map