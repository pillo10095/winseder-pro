import { render, screen } from '@testing-library/react';
import { DateTime, Greeting } from '@/components/shared/date-time';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-06-15T10:30:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('DateTime', () => {
  it('renders formatted date in Spanish', () => {
    render(<DateTime />);
    expect(screen.getByText(/domingo, 15 de junio de 2025/)).toBeInTheDocument();
  });

  it('renders time in HH:MM:SS format', () => {
    render(<DateTime />);
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('renders a <time> element with ISO dateTime attribute in UTC', () => {
    render(<DateTime />);
    const timeEl = screen.getByText(/domingo/).closest('time');
    expect(timeEl).toHaveAttribute('dateTime', '2025-06-15T10:30:00.000Z');
  });
});

describe('Greeting', () => {
  it('renders a greeting text', () => {
    render(<Greeting />);
    const greeting = screen.getByText(/Buen[ao]s (días|tardes|noches)/);
    expect(greeting).toBeInTheDocument();
  });

  it('includes the user name when provided', () => {
    render(<Greeting name="Juan" />);
    expect(screen.getByText('Juan')).toBeInTheDocument();
  });

  it('renders without name when not provided', () => {
    render(<Greeting />);
    expect(screen.queryByText(/,/)).not.toBeInTheDocument();
  });
});
