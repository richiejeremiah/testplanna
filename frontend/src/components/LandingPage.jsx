import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/demo');
  };

  return (
    <div className="bg-white text-slate-900 antialiased">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              {/* Logo Icon */}
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">T</div>
              <span className="font-bold text-xl tracking-tight text-slate-800">TestPlanna</span>
            </div>
            <div className="hidden md:flex space-x-8 items-center">
              <a href="#how-it-works" className="text-slate-600 hover:text-brand-600 font-medium transition">How it Works</a>
              <a href="#features" className="text-slate-600 hover:text-brand-600 font-medium transition">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-brand-600 font-medium transition">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hidden md:block text-slate-600 hover:text-slate-900 font-medium">Login</a>
              <button 
                onClick={handleGetStarted}
                className="bg-slate-900 text-white px-5 py-2 rounded-full font-medium hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background Blobs */}
        <div className="blob bg-brand-200 w-96 h-96 rounded-full top-0 left-0 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="blob bg-blue-200 w-80 h-80 rounded-full bottom-0 right-0 translate-x-1/3 translate-y-1/3 animation-delay-2000"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              Now integrating with Jira Cloud
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6">
              Your Jira Testing, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-blue-600">Planned by AI.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto lg:mx-0">
              Stop writing manual test cases. TestPlanna analyzes your code, generates test scenarios, and automates execution—all inside Jira.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button 
                onClick={handleGetStarted}
                className="bg-brand-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                Start Free Trial
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/workflows/demo', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    if (data.workflowId) {
                      navigate(`/demo?workflowId=${data.workflowId}`);
                    }
                  } catch (error) {
                    console.error('Demo error:', error);
                    navigate('/demo');
                  }
                }}
                className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-green-700 transition shadow-xl shadow-green-500/20 flex items-center justify-center gap-2"
              >
                🚀 Try Demo
              </button>
              <a href="#how-it-works" className="bg-white text-slate-700 border border-slate-200 px-8 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-jira-blue" fill="currentColor" viewBox="0 0 24 24"><path d="M11.53 2C6.45 2.16 2.5 6.5 2.5 12c0 6.07 5.35 10.5 10.5 10.5 5.15 0 10.5-4.43 10.5-10.5 0-5.5-3.95-9.84-9.03-10 0 0-.17 0-.17 0H11.53zM12 4h1.5l-4.5 9h5.5l-5.5 9V11H4.5L12 4z"/></svg>
                See Integration
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">No credit card required · 14-day free trial</p>
          </div>

          {/* Hero Visual (Mock Dashboard) */}
          <div className="relative lg:h-[500px] w-full flex items-center justify-center">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden transform rotate-2 hover:rotate-0 transition duration-500">
              {/* Header of mock app */}
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="h-4 w-32 bg-slate-200 rounded ml-4"></div>
              </div>
              {/* Body of mock app */}
              <div className="p-6 space-y-6">
                {/* Ticket Item */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">TP-42</div>
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-slate-800 rounded mb-2"></div>
                    <div className="h-3 w-1/2 bg-slate-300 rounded"></div>
                  </div>
                </div>
                
                {/* AI Generation Section */}
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 relative">
                  <div className="absolute -top-3 -right-3 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded shadow-md">AI Generated</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                      <div className="h-3 w-full bg-slate-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                      <div className="h-3 w-5/6 bg-slate-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                      <div className="h-3 w-4/5 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-brand-200 flex justify-between items-center">
                    <span className="text-xs text-brand-700 font-medium">Coverage: 100%</span>
                    <button className="bg-brand-600 text-white text-xs px-3 py-1 rounded hover:bg-brand-700">Run Tests</button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute bottom-10 -left-4 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce">
              <div className="bg-green-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Status</p>
                <p className="text-sm font-bold text-slate-900">0 Bugs Found</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Trusted by QA teams at modern companies</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition duration-500">
            <h3 className="text-xl font-bold text-slate-700">AcmeCorp</h3>
            <h3 className="text-xl font-bold text-slate-700">GlobalTech</h3>
            <h3 className="text-xl font-bold text-slate-700">Nebula</h3>
            <h3 className="text-xl font-bold text-slate-700">FoxRun</h3>
            <h3 className="text-xl font-bold text-slate-700">Circle.io</h3>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-brand-600 font-semibold tracking-wide uppercase text-sm">Features</h2>
            <h3 className="mt-2 text-3xl lg:text-4xl font-bold text-slate-900">Everything you need to ship faster.</h3>
            <p className="mt-4 text-lg text-slate-600">We bridge the gap between product requirements and quality assurance using advanced LLMs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">User Story Analysis</h4>
              <p className="text-slate-600 leading-relaxed">Our AI reads your Jira tickets, understands the acceptance criteria, and identifies edge cases automatically.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Auto-Generate Tests</h4>
              <p className="text-slate-600 leading-relaxed">Convert requirements into Gherkin syntax or standard test steps instantly. No more blank page syndrome.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Self-Healing Scripts</h4>
              <p className="text-slate-600 leading-relaxed">When UI changes, TestPlanna adapts the automation scripts automatically, reducing maintenance overhead.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works (Split) */}
      <section id="how-it-works" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Works where you work.</h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-sm">1</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Connect Jira</h4>
                    <p className="text-slate-400">One-click integration with your Jira board. Select the projects you want to monitor.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-sm">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">AI Drafts the Plan</h4>
                    <p className="text-slate-400">As soon as a ticket moves to "Ready for QA," TestPlanna creates a test plan comment on the ticket.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-sm">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Approve & Execute</h4>
                    <p className="text-slate-400">Review the plan, click "Approve", and watch the automation agents execute the tests in the cloud.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 relative">
              {/* Code snippet visual */}
              <div className="font-mono text-sm text-green-400">
                <p className="mb-2"><span className="text-purple-400">Scenario:</span> Successful Login</p>
                <p className="pl-4 mb-1"><span className="text-blue-400">Given</span> user is on login page</p>
                <p className="pl-4 mb-1"><span className="text-blue-400">When</span> user enters valid credentials</p>
                <p className="pl-4 mb-1"><span className="text-blue-400">And</span> clicks submit button</p>
                <p className="pl-4 mb-4"><span className="text-blue-400">Then</span> user is redirected to dashboard</p>
                
                <div className="h-px bg-slate-600 my-4"></div>
                
                <p className="text-slate-400">// TestPlanna generating Playwright script...</p>
                <p className="text-white mt-2">await <span className="text-yellow-300">page</span>.goto('/login');</p>
                <p className="text-white">await <span className="text-yellow-300">page</span>.fill('#email', 'user@test.com');</p>
                <p className="text-white">await <span className="text-yellow-300">page</span>.click('#submit-btn');</p>
              </div>
              {/* Floating element */}
              <div className="absolute -bottom-6 -right-6 bg-white text-slate-900 p-4 rounded-xl shadow-lg flex items-center gap-3">
                <div className="spinner border-2 border-slate-200 border-t-brand-500 rounded-full w-5 h-5 animate-spin"></div>
                <span className="font-bold text-sm">Running Test 3/12...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-brand-600 to-blue-700 rounded-3xl p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 pattern-diagonal-lines"></div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 relative z-10">Ready to automate your QA?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto relative z-10">Join 500+ engineering teams saving hours every week with TestPlanna.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <button 
                onClick={handleGetStarted}
                className="bg-white text-brand-700 px-8 py-4 rounded-xl font-bold hover:bg-brand-50 transition shadow-lg"
              >
                Get Started for Free
              </button>
              <a href="#how-it-works" className="bg-transparent border border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition">Book a Demo</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center text-white font-bold text-xs">T</div>
                <span className="font-bold text-lg text-slate-800">TestPlanna</span>
              </div>
              <p className="text-slate-500 text-sm">AI-powered test planning and automation for modern Jira teams.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#features" className="hover:text-brand-600">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-brand-600">Integrations</a></li>
                <li><a href="#pricing" className="hover:text-brand-600">Pricing</a></li>
                <li><a href="#" className="hover:text-brand-600">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-brand-600">Documentation</a></li>
                <li><a href="#" className="hover:text-brand-600">API Reference</a></li>
                <li><a href="#" className="hover:text-brand-600">Community</a></li>
                <li><a href="#" className="hover:text-brand-600">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-brand-600">About</a></li>
                <li><a href="#" className="hover:text-brand-600">Careers</a></li>
                <li><a href="#" className="hover:text-brand-600">Legal</a></li>
                <li><a href="#" className="hover:text-brand-600">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">© 2024 TestPlanna Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-400 hover:text-slate-600"><span className="sr-only">Twitter</span><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg></a>
              <a href="#" className="text-slate-400 hover:text-slate-600"><span className="sr-only">GitHub</span><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

