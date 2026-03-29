import { CallSession } from '../models/types';
export declare class CallRouter {
    routeCall(callSession: CallSession): Promise<void>;
    private bridgeToHuman;
    private bridgeToBot;
}
export declare const callRouter: CallRouter;
//# sourceMappingURL=callRouter.d.ts.map