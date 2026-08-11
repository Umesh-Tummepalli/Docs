import { Button } from "@/components/ui/button";


const MicrosoftAuth = () => {
  const handleMicrosoftOAuth = () => {
    
  };
  return (
    <Button
      variant="outline"
      type="button"
      onClick={handleMicrosoftOAuth}
      className="h-11 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium transition-all"
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