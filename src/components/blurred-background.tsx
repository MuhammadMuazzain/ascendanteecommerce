interface BlurredBackgroundProps {
  className?: string;
}

export function BlurredBackground({ className = "" }: BlurredBackgroundProps) {
  return (
    <div
      className={`absolute top-[-50px] sm:top-[-75px] lg:top-[-100px] w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[880px] h-[100px] sm:h-[120px] lg:h-[154px] left-1/2 transform -translate-x-1/2 bg-[#195b95] blur-[100px] sm:blur-[125px] lg:blur-[150px] opacity-70 ${className}`}
    />
  );
}
