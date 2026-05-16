export const Player = ({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) => {
  return (
    <div
      id="preview-container"
      className="flex flex-1 justify-center items-center bg-[#333] relative overflow-hidden h-full w-full"
    >
      <canvas
        ref={canvasRef}
        id="preview-canvas"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};
