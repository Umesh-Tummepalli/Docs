import { Button } from "@/components/ui/button";


const MicrosoftAuth = () => {
  const handleMicrosoftOAuth = () => {
    
  };
  return (
    <Button
      variant="outline"
      type="button"
      onClick={handleMicrosoftOAuth}
      className="h-11 border-slate-200 bg-white font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-md"
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21">
        <path fill="#f25022" d="M1 1h9v9H1z" />
        <path fill="#00a4ef" d="M1 11h9v9H1z" />
        <path fill="#7fba00" d="M11 1h9v9h-9z" />
        <path fill="#ffb900" d="M11 11h9v9h-9z" />
      </svg>
      Microsoft
    </Button>
  )
}
export default MicrosoftAuth;
