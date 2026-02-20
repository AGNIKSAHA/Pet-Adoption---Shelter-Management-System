import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    width?: number | string;
    height?: number | string;
    effect?: "blur" | "opacity" | "black-and-white";
    placeholderSrc?: string;
}
export default function LazyImage({ src, alt, className = "", width, height, effect = "blur", placeholderSrc, }: LazyImageProps) {
    return (<LazyLoadImage alt={alt} src={src} width={width} height={height} effect={effect} className={className} placeholderSrc={placeholderSrc || "/placeholder-pet.jpg"} threshold={100} wrapperClassName={className}/>);
}
