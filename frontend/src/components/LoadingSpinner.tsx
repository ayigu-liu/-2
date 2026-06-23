interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "连接中..." }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-700/30" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 animate-spin" />
        </div>
        <p className="text-sm text-emerald-300/70 animate-pulse">{message}</p>
      </div>
    </div>
  );
}
