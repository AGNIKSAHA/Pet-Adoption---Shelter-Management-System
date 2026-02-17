export const formatAge = (months: number): string => {
  if (months < 1) return "Newborn";
  if (months < 12) {
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const yearStr = `${years} ${years === 1 ? "year" : "years"}`;
  if (remainingMonths === 0) {
    return yearStr;
  }
  return `${yearStr} ${remainingMonths} ${remainingMonths === 1 ? "mo" : "mos"}`;
};
