export const customerEmailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const customerPhonePattern=/^(?:[0-9]{10}|[0-9]{3}[- ][0-9]{3}[- ][0-9]{4}|\([0-9]{3}\)[ -][0-9]{3}[- ][0-9]{4}|\+1[ -][0-9]{3}[- ][0-9]{3}[- ][0-9]{4}|\+1[ -]\([0-9]{3}\)[ -][0-9]{3}[- ][0-9]{4})$/;
export const normalizeCustomerPhone=(value:string)=>{const source=value.trim();if(!customerPhonePattern.test(source))return null;const digits=source.replace(/[^0-9]/g,"");return digits.length===10||digits.length===11&&digits.startsWith("1")?digits:null;};
