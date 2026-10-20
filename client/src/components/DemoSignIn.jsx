import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { Copy, Loader2Icon, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";

// Public demo account so reviewers can try NeatDesk without signing up.
// Set both variables to enable it; leave them empty to hide the card.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || "";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "";
const isDemoEnabled = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

const copy = async (text, label) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    } catch {
        toast.error("Couldn't copy — select the text instead");
    }
};

const DemoSignIn = () => {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [loading, setLoading] = useState(false);

    if (!isDemoEnabled) return null;

    const handleDemo = async () => {
        if (!isLoaded || loading) return;
        setLoading(true);
        try {
            const result = await signIn.create({ identifier: DEMO_EMAIL, password: DEMO_PASSWORD });
            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                toast.success("Signed in to the demo workspace");
            } else {
                // e.g. Clerk asks for an extra verification step on a new device
                toast("One more step — finish signing in with the form below", { icon: "ℹ️" });
            }
        } catch (error) {
            const message = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error.message;
            toast.error(message || "Demo sign-in failed — use the credentials below");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[400px] rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/40 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Recruiters &amp; reviewers</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">Try NeatDesk without signing up</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">A shared demo workspace with sample projects and tasks.</p>

            <button
                type="button"
                onClick={handleDemo}
                disabled={!isLoaded || loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
                {loading ? <Loader2Icon className="size-5 animate-spin" /> : <PlayCircle className="size-5" />}
                {loading ? "Signing in…" : "Try the demo — one click"}
            </button>

            <div className="mt-4 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Or sign in below with:</p>
                {[["Email", DEMO_EMAIL], ["Password", DEMO_PASSWORD]].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2 rounded-md bg-white dark:bg-zinc-900 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800">
                        <span className="truncate"><span className="text-zinc-500">{label}:</span> <code className="font-mono">{value}</code></span>
                        <button type="button" onClick={() => copy(value, label)} className="shrink-0 text-zinc-500 hover:text-blue-600" aria-label={`Copy demo ${label.toLowerCase()}`}>
                            <Copy className="size-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DemoSignIn;
