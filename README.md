# PesaPlan – Personal Finance Management App

PesaPlan is a lightweight personal finance management tool that helps users track their daily expenses, manage budgets, and achieve their financial goals — all from a clean, simple interface.

[Vercel Deploy](https://pesaplan.vercel.app)

Email
--------------------------------------------------------------------------
# Credentials
- You can log in using demo credentials:
  - Email: milkakeza9@gmail.com
  - Password: MimiKeke
--------------------------------------------------------------------------

## Features

- Visualize monthly income and expenses
- Categorize spending and budgeting
- Alerts for Budget limits
- Cloud-based data with Supabase integration
- Responsive, accessible UI Powered by React (via Next.js) and styled with Tailwind CSS

------------------------------------------------------------------------

## Tech Stack

- Next.js – Server-side rendering and routing
- React – UI components
- Tailwind CSS – Utility-first styling
- Supabase – Real-time database and authentication
- TypeScript – Strongly typed JavaScript
- Vercel – Seamless deployment

--------------------------------------------------------------------------

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/milkakeza/PesaPlanRwanda
cd pesaplan
```

2. Install dependencies:

```bash
npm install
```

3. Set up your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

--------------------------------------------------------------------------

## Deployment

The project is deployed using [Vercel](https://vercel.com/). You can deploy your own version by:

- Linking your GitHub repo to Vercel
- Adding your environment variables
- Hitting "Deploy"

--------------------------------------------------------------------------

## Project Structure

```
.
├── components/       # Reusable UI components
├── pages/            # Next.js routing
├── lib/              # Supabase client & utils
├── styles/           # Global and Tailwind styles
├── public/           # Static assets
├── package.json
└── README.md
```

--------------------------------------------------------------------------

## Contact

Have questions, feedback, or feature requests? Reach out via [your-email@example.com] or open an issue.

--------------------------------------------------------------------------

## License

This project is licensed under the MIT License.

