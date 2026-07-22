export const colors = {
  black: '#1A1A1A',
  white: '#FFFFFF',
  orange: '#FF6B00',
  orangeDark: '#E55A00',
  orangeLight: '#FF8533',
  orangeDim: 'rgba(255, 107, 0, 0.10)',
  orangeBg: '#FFF7F0',
  grayBg: '#FAFAFA',
  grayBorder: '#EEEEEE',
  grayText: '#9E9E9E',
  textDark: '#1A1A1A',
  textSecondary: '#666666',
  red: '#E63946',
  green: '#2A9D8F',
  blue: '#2D7FF9',
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const typography = {
  heading: { fontWeight: '800' as const },
};
