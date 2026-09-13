import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Payasus Fiestas | Cierre de venta',description:'Contrata inflables, pintacaritas y animación para tu próximo evento con Payasus Fiestas.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Payasus Fiestas',statusBarStyle:'black-translucent'},icons:{icon:'/payasus-fiestas-icon.svg',apple:'/payasus-fiestas-icon.svg'}};
export const viewport:Viewport={themeColor:'#073d70',width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}</body></html>}

