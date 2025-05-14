module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        agendaGold: '#FFD580',
        agendaOrange: '#FFB347',
        agendaPurple: '#6C4AB6',
        agendaGreen: '#4ADE80',
        agendaCard: '#23212B',
        agendaCardDark: '#18171F',
        agendaAccent: '#3B2F7F',
      },
      boxShadow: {
        agenda: '0 4px 24px 0 rgba(108, 99, 255, 0.10)',
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}; 