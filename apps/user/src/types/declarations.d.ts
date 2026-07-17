// Global TypeScript Declarations for Saathi App

declare module '*.css' {
  const content: { [className: string]: string } | any;
  export default content;
}

declare module 'react-native-razorpay' {
  const RazorpayCheckout: any;
  export default RazorpayCheckout;
}
