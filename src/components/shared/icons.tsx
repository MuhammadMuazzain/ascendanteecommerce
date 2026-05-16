import type { LucideProps } from "lucide-react";
import {
  AudioLines,
  Bell,
  CircleArrowDown,
  CircleCheck,
  Download,
  EllipsisVertical,
  Instagram,
  Loader2,
  MoveLeft,
  Star,
  Sparkles,
  ArrowLeftRight,
  ThumbsDown,
  XCircle,
  Youtube,
} from "lucide-react";

export const Icons = {
  ai: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none">
        <path
          fill="currentColor"
          fillOpacity="0.16"
          d="m9.96 9.137l.886-3.099c.332-1.16 1.976-1.16 2.308 0l.885 3.099a1.2 1.2 0 0 0 .824.824l3.099.885c1.16.332 1.16 1.976 0 2.308l-3.099.885a1.2 1.2 0 0 0-.824.824l-.885 3.099c-.332 1.16-1.976 1.16-2.308 0l-.885-3.099a1.2 1.2 0 0 0-.824-.824l-3.099-.885c-1.16-.332-1.16-1.976 0-2.308l3.099-.885a1.2 1.2 0 0 0 .824-.824"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="1.5"
          d="m9.96 9.137l.886-3.099c.332-1.16 1.976-1.16 2.308 0l.885 3.099a1.2 1.2 0 0 0 .824.824l3.099.885c1.16.332 1.16 1.976 0 2.308l-3.099.885a1.2 1.2 0 0 0-.824.824l-.885 3.099c-.332 1.16-1.976 1.16-2.308 0l-.885-3.099a1.2 1.2 0 0 0-.824-.824l-3.099-.885c-1.16-.332-1.16-1.976 0-2.308l3.099-.885a1.2 1.2 0 0 0 .824-.824M4.43 4.283l.376-1.507c.05-.202.338-.202.388 0l.377 1.507a.2.2 0 0 0 .145.146l1.508.377c.202.05.202.337 0 .388l-1.508.377a.2.2 0 0 0-.145.145l-.377 1.508c-.05.202-.338.202-.388 0l-.377-1.508a.2.2 0 0 0-.145-.145l-1.508-.377c-.202-.05-.202-.338 0-.388l1.508-.377a.2.2 0 0 0 .145-.146M18.43 18.284l.376-1.508c.05-.202.337-.202.388 0l.377 1.508a.2.2 0 0 0 .145.145l1.508.377c.202.05.202.337 0 .388l-1.508.377a.2.2 0 0 0-.145.145l-.377 1.508c-.05.202-.337.202-.388 0l-.377-1.508a.2.2 0 0 0-.145-.145l-1.508-.377c-.202-.05-.202-.338 0-.388l1.508-.377a.2.2 0 0 0 .145-.145"
        />
      </g>
    </svg>
  ),
  apple: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 14.5v3m0-10v3m0-8c2.21 0 4 1.79 4 4s-1.79 4-4 4s-4-1.79-4-4s1.79-4 4-4m0-8C8.79 2 7 3.79 7 6s1.79 4 4 4s4-1.79 4-4s-1.79-4-4-4"
      />
    </svg>
  ),
  arrowLeft: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.5 12.002H19m-8 6s-6-4.419-6-6s6-6 6-6"
      />
    </svg>
  ),
  arrowUp: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 5.5V19m6-8s-4.419-6-6-6s-6 6-6 6"
      />
    </svg>
  ),
  assetsPlus: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          strokeLinecap="round"
          d="M11.509 2.99c-4.483 0-6.725 0-8.117 1.392s-1.393 3.633-1.393 8.114s0 6.722 1.393 8.114c1.392 1.392 3.634 1.392 8.116 1.392c4.483 0 6.725 0 8.117-1.392s1.393-3.633 1.393-8.114v-.5"
        />
        <path d="M4.999 20.99c4.21-4.751 8.941-11.053 16-6.327" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.996 1.998v8.008M22 5.977l-8.01.015"
        />
      </g>
    </svg>
  ),
  bell: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1"
      />
    </svg>
  ),
  checkCircle: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10s10-4.477 10-10Z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12.75s1.6.912 2.4 2.25c0 0 2.4-5.25 5.6-7"
        />
      </g>
    </svg>
  ),
  circleArrowDown: CircleArrowDown,
  circleCheck: CircleCheck,
  code: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m17 8l1.84 1.85c.773.778 1.16 1.167 1.16 1.65s-.387.872-1.16 1.65L17 15M7 8L5.16 9.85C4.387 10.628 4 11.017 4 11.5s.387.872 1.16 1.65L7 15m7.5-11l-5 16"
      />
    </svg>
  ),
  undo: ({ ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      // width="24"
      // height="24"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7.53 3.47a.75.75 0 0 1 0 1.06L5.81 6.25h9.226c.904 0 1.633 0 2.222.053c.606.055 1.136.172 1.617.45a3.75 3.75 0 0 1 1.373 1.372c.277.481.394 1.011.449 1.617c.053.589.053 1.318.053 2.222v.072c0 .904 0 1.633-.053 2.222c-.055.606-.171 1.136-.45 1.617a3.75 3.75 0 0 1-1.372 1.373c-.481.277-1.011.394-1.617.449c-.589.053-1.318.053-2.222.053H8a.75.75 0 0 1 0-1.5h7c.948 0 1.61 0 2.122-.047c.503-.046.788-.13 1.003-.254a2.25 2.25 0 0 0 .824-.824c.124-.215.208-.5.254-1.003c.046-.512.047-1.174.047-2.122s0-1.61-.047-2.122c-.046-.503-.13-.788-.254-1.003a2.25 2.25 0 0 0-.824-.824c-.215-.124-.5-.208-1.003-.254c-.512-.046-1.174-.047-2.122-.047H5.81l1.72 1.72a.75.75 0 1 1-1.06 1.06l-3-3a.75.75 0 0 1 0-1.06l3-3a.75.75 0 0 1 1.06 0"
        clipRule="evenodd"
      />
    </svg>
  ),
  redo: ({ ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      // width="24"
      // height="24"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16.47 3.47a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9c-.948 0-1.61 0-2.122.047c-.503.046-.788.13-1.003.254a2.25 2.25 0 0 0-.824.824c-.124.215-.208.5-.254 1.003c-.046.512-.047 1.174-.047 2.122s0 1.61.047 2.122c.046.502.13.788.254 1.003c.198.342.482.626.824.824c.215.124.5.208 1.003.254c.512.046 1.174.047 2.122.047h7a.75.75 0 0 1 0 1.5H8.964c-.904 0-1.633 0-2.222-.053c-.606-.055-1.136-.172-1.617-.45a3.75 3.75 0 0 1-1.373-1.372c-.277-.481-.394-1.011-.449-1.617c-.053-.589-.053-1.318-.053-2.222v-.072c0-.904 0-1.633.053-2.222c.055-.606.172-1.136.45-1.617a3.75 3.75 0 0 1 1.372-1.373c.481-.277 1.011-.394 1.617-.449c.589-.053 1.318-.053 2.222-.053h9.225l-1.72-1.72a.75.75 0 0 1 0-1.06"
        clipRule="evenodd"
      />
    </svg>
  ),
  delete: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        d="m19.5 5.5l-.62 10.025c-.158 2.561-.237 3.842-.88 4.763a4 4 0 0 1-1.2 1.128c-.957.584-2.24.584-4.806.584c-2.57 0-3.855 0-4.814-.585a4 4 0 0 1-1.2-1.13c-.642-.922-.72-2.205-.874-4.77L4.5 5.5M3 5.5h18m-4.944 0l-.683-1.408c-.453-.936-.68-1.403-1.071-1.695a2 2 0 0 0-.275-.172C13.594 2 13.074 2 12.035 2c-1.066 0-1.599 0-2.04.234a2 2 0 0 0-.278.18c-.395.303-.616.788-1.058 1.757L8.053 5.5m1.447 11v-6m5 6v-6"
      />
    </svg>
  ),
  download: Download,
  ellipsisVertical: EllipsisVertical,
  equalizer: AudioLines,
  film: ({ ...props }: LucideProps) => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12.1429 15.7857H4.85721C2.85364 15.7857 1.21436 14.1464 1.21436 12.1429V4.85714C1.21436 2.85357 2.85364 1.21428 4.85721 1.21428H9.10721H12.1429C14.1465 1.21428 15.7858 2.85357 15.7858 4.85714V12.1429C15.7858 14.1464 14.1465 15.7857 12.1429 15.7857ZM2.42864 6.07142V12.1429C2.42864 13.4786 3.5215 14.5714 4.85721 14.5714H12.1429C13.4786 14.5714 14.5715 13.4786 14.5715 12.1429V6.07142H2.42864ZM11.8394 4.85714H14.5715C14.5715 3.52142 13.4786 2.42857 12.1429 2.42857H10.2608L11.8394 4.85714ZM7.58936 4.85714H10.3822L8.74293 2.42857H6.01078L7.58936 4.85714ZM2.42864 4.85714H6.13221L4.55364 2.42857C3.33936 2.61071 2.42864 3.64285 2.42864 4.85714ZM7.89293 9.59285V11.1107L9.16793 10.3821L7.89293 9.59285ZM7.28578 12.75C6.98221 12.75 6.67864 12.4464 6.67864 12.1429V8.49999C6.67864 8.25714 6.80007 8.07499 6.98221 7.95357C7.16436 7.83214 7.40721 7.83214 7.58936 7.95357L10.6251 9.77499C10.8072 9.89642 10.9286 10.0786 10.9286 10.3214C10.9286 10.5643 10.8072 10.7464 10.6251 10.8679L7.58936 12.6893C7.52864 12.75 7.40721 12.75 7.28578 12.75Z"
        fill="currentColor"
      />
    </svg>
  ),
  folder: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"
      />
    </svg>
  ),
  home: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path d="M5 12H3l9-9l9 9h-2M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        <path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
      </g>
    </svg>
  ),
  homeFilled: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M13.45 2.533a2.25 2.25 0 0 0-2.9 0L3.8 8.228a2.25 2.25 0 0 0-.8 1.72v9.305c0 .966.784 1.75 1.75 1.75h3a1.75 1.75 0 0 0 1.75-1.75V15.25c0-.68.542-1.232 1.217-1.25h2.566a1.25 1.25 0 0 1 1.217 1.25v4.003c0 .966.784 1.75 1.75 1.75h3a1.75 1.75 0 0 0 1.75-1.75V9.947a2.25 2.25 0 0 0-.8-1.72z"
      />
    </svg>
  ),
  instagram: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12Z"
        />
        <path strokeWidth="1.5" d="M16.5 12a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.508 6.5h-.01" />
      </g>
    </svg>
  ),
  menu: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  ),
  moreHorizontal: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M11.996 12h.009M18 12h.009M6 12h.009"
      />
    </svg>
  ),
  moveLeft: MoveLeft,
  plus: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 5v14m-7-7h14"
      />
    </svg>
  ),
  settingsSimple: ({ ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 17H5" />
      <path d="M19 7h-9" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  ),
  shuffle: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m19.558 4l.897.976c.401.436.602.654.531.839S20.632 6 20.065 6c-1.27 0-2.788-.205-3.954.473c-.72.42-1.223 1.152-2.072 2.527M3 18h1.58c1.929 0 2.893 0 3.706-.473c.721-.42 1.223-1.152 2.072-2.527m9.2 5l.897-.976c.401-.436.602-.654.531-.839S20.632 18 20.065 18c-1.27 0-2.788.205-3.954-.473c-.813-.474-1.348-1.346-2.418-3.09l-2.99-4.875C9.635 7.82 9.1 6.947 8.287 6.473S6.51 6 4.581 6H3"
      />
    </svg>
  ),
  spinner: Loader2,
  sparkle: Sparkles,
  star: Star,
  thumbsDown: ThumbsDown,
  tiktok: (props: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12Z" />
        <path
          strokeLinecap="round"
          d="M10.536 11.008c-.82-.116-2.69.075-3.606 1.77s.007 3.459.584 4.129c.569.627 2.378 1.814 4.297.655c.476-.287 1.069-.502 1.741-2.747l-.078-8.834c-.13.973.945 3.255 4.004 3.525"
        />
      </g>
    </svg>
  ),
  timer: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2" />
      </g>
    </svg>
  ),
  video: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 11c0-3.3 0-4.95 1.025-5.975S5.7 4 9 4h1c3.3 0 4.95 0 5.975 1.025S17 7.7 17 11v2c0 3.3 0 4.95-1.025 5.975S13.3 20 10 20H9c-3.3 0-4.95 0-5.975-1.025S2 16.3 2 13z" />
        <path
          strokeLinecap="round"
          d="m17 8.906l.126-.104c2.116-1.746 3.174-2.619 4.024-2.197c.85.421.85 1.819.85 4.613v1.564c0 2.794 0 4.192-.85 4.613s-1.908-.451-4.024-2.197L17 15.094"
        />
        <circle cx="11.5" cy="9.5" r="1.5" />
      </g>
    </svg>
  ),
  transition: ArrowLeftRight,
  voice: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-3-6v4m-3-3v2m9-3v4m3-3v2" />
      </g>
    </svg>
  ),
  youtube: ({ ...props }: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 20.5c1.81 0 3.545-.179 5.153-.507c2.01-.41 3.014-.614 3.93-1.792c.917-1.179.917-2.532.917-5.238v-1.926c0-2.706 0-4.06-.917-5.238c-.916-1.178-1.92-1.383-3.93-1.792A26 26 0 0 0 12 3.5c-1.81 0-3.545.179-5.153.507c-2.01.41-3.014.614-3.93 1.792C2 6.978 2 8.331 2 11.037v1.926c0 2.706 0 4.06.917 5.238c.916 1.178 1.92 1.383 3.93 1.792c1.608.328 3.343.507 5.153.507Z" />
        <path
          strokeLinejoin="round"
          d="M15.962 12.313c-.148.606-.938 1.04-2.517 1.911c-1.718.947-2.577 1.42-3.272 1.237a1.7 1.7 0 0 1-.635-.317C9 14.709 9 13.806 9 12s0-2.709.538-3.144c.182-.147.4-.256.635-.317c.695-.183 1.554.29 3.272 1.237c1.58.87 2.369 1.305 2.517 1.911c.05.206.05.42 0 .626Z"
        />
      </g>
    </svg>
  ),
  xCircle: XCircle,
  animations: ({ ...props }: LucideProps) => (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      role="presentation"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g>
        <path
          data-follow-fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.727 14.546a5.273 5.273 0 1 0 0-10.546 5.273 5.273 0 0 0 0 10.546Zm0 2a7.273 7.273 0 1 0 0-14.546 7.273 7.273 0 0 0 0 14.546Z"
          fill="currentColor"
        ></path>
        <path
          data-follow-fill="currentColor"
          opacity=".5"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.404 5.677a7.273 7.273 0 1 0 9.919 9.919 7.233 7.233 0 0 1-3.298.944A5.455 5.455 0 0 1 7.46 8.974a7.233 7.233 0 0 1 .944-3.298Z"
          fill="currentColor"
        ></path>
        <path
          data-follow-fill="currentColor"
          opacity=".3"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.677 8.404a7.273 7.273 0 1 0 9.918 9.92 7.233 7.233 0 0 1-3.298.943 5.455 5.455 0 0 1-7.564-7.565 7.232 7.232 0 0 1 .944-3.298Z"
          fill="currentColor"
        ></path>
      </g>
    </svg>
  ),
};
