import { Navigate } from "react-router-dom";

// Pro subscriptions have been retired in favour of a prepaid wallet.
// Anyone landing on /subscription is redirected to the wallet.
const Subscription = () => <Navigate to="/wallet" replace />;

export default Subscription;
