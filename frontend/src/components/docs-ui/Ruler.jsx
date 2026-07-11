

const markers = Array.from({ length: 83 }, (_, i) => i);
const Ruler = () => {
  return (
    <div className="print:hidden h-6 border-b border-gray-300 flex items-end realative select-none mx-auto justify-center">
      <div className = "max-w-204 max-auto w-full h-full relative">
        <div className = "absolute inset-x-0 bottom-0 h-full ">
          <div className = "relative h-full w-204">
            {
              markers.map((marker) => {
                const pos = (marker * 816) / 82;
                return (
                  <div
                    key={marker}
                    className="absolute bottom-0"
                    style={{left : `${pos}px`}}
                  >
                    {marker % 10 == 0 && (
                      <>
                        <div className=" absolute bottom-0 w-[2px] h-2 bg-neutral-500 " />
                        <span className="aboslute bottom-2 text-[10px] text-neutral-500 transform -translate-x-1/2 ">
                          {marker/10 + 1}
                        </span>
                      </>
                    )
                    }
                    {marker % 5 == 0 && marker % 10 != 0
                      && (
                      <>
                        <div className = " absolute bottom-0 w-[1px] h-1.5 bg-nuetral-500 ">
                            
                        </div>
                      </>
                      )} 
                  </div>
                )
              })
            }
          </div>
        </div>
          
      </div>
    </div>
    )
}

export default Ruler;