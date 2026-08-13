import api from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
const Home = () => {
  const navigate = useNavigate()
  const handleCreateNewDocument =async () => {
    try {
      const response = await api.post('/documents/new', {});
      navigate(`/doc/${response.data.documentId}`);
    } catch (error) {
      if(error?.response?.status===401) {
        navigate('/login');
        toast.error("Login to Continue");
      }
      else {
        console.log(error?.response);
        toast.error(error.message || "Something went wrong");
      }
    }
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col items-center justify-center p-5">
        <h2 className="mb-5 text-2xl font-normal text-gray-600">
          Start a new document
        </h2>

        <div className="flex justify-center w-full">
          <button
            className="flex flex-col items-center justify-center w-44 h-44 border border-gray-300 rounded-lg cursor-pointer bg-white transition-shadow duration-200 hover:shadow-[0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)]"
            onClick={handleCreateNewDocument}
          >
            <img
              src="https://ssl.gstatic.com/docs/templates/thumbnails/docs-blank-googlecolors.png"
              alt="Blank document"
              className="w-24 h-30 object-contain"
            />
            <span className="mt-2.5 text-sm text-gray-700">
              Blank document
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home;
