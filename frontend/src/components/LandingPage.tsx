import React from 'react';
import { Brain, TrendingUp, Activity, BarChart3, CheckCircle, ArrowRight, Star } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 fixed top-0 left-0 right-0 z-[9999] shadow-sm animate-fade-in-up">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-cyan-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                StressKE
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollToSection('home')}
                className="px-4 py-2 text-slate-700 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="px-4 py-2 text-slate-700 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="px-4 py-2 text-slate-700 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className="px-4 py-2 text-slate-700 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium"
              >
                Testimonials
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="px-4 py-2 text-slate-700 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium"
              >
                About
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="px-5 py-2 text-slate-700 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium"
            >
              Login
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <section id="home" className="relative bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 py-20 overflow-hidden pt-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-300/30 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-teal-300/30 rounded-full blur-3xl animate-pulse-slow delay-200"></div>
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-300/30 rounded-full blur-3xl animate-pulse-slow delay-400"></div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/20 via-blue-200/20 to-teal-200/20 animate-breathe pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-block mb-4 px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-semibold animate-fade-in-up delay-100">
            AI-POWERED STRESS DETECTION
          </div>
          <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight animate-fade-in-up delay-200">
            Know Your Stress Level,<br />
            <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
              Take Control
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up delay-300">
            StressKE uses advanced AI-powered facial emotion analysis to detect your stress levels in seconds. Get instant insights, personalized recommendations, and track your stress patterns over time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-400">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-2 shadow-lg"
            >
              <Activity className="w-5 h-5" />
              Get Your Stress Score
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="px-8 py-4 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              See How It Works
            </button>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-200/40 to-transparent rounded-full blur-3xl animate-breathe-slow"></div>
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <AnimatedSection animation="fade-up">
            <h2 className="text-4xl font-bold text-slate-900 text-center mb-16">
              Powerful Features for Stress Management
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatedSection animation="fade-up" delay={100}>
              <div className="p-8 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl border border-cyan-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <Brain className="w-12 h-12 text-cyan-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Analysis</h3>
                <p className="text-slate-700">
                  Get real-time stress detection powered by advanced AI facial emotion recognition. Results in seconds, not hours.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200}>
              <div className="p-8 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl border border-teal-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <TrendingUp className="w-12 h-12 text-teal-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Track Trends</h3>
                <p className="text-slate-700">
                  Monitor your stress patterns over time with beautiful visualizations. Understand what triggers your stress.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={300}>
              <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <BarChart3 className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Insights</h3>
                <p className="text-slate-700">
                  Receive personalized recommendations and actionable advice to manage your stress effectively.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={400}>
              <div className="p-8 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <Activity className="w-12 h-12 text-emerald-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Emotion Breakdown</h3>
                <p className="text-slate-700">
                  Detailed emotion probability analysis helps you understand the nuances of your emotional state.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={500}>
              <div className="p-8 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <CheckCircle className="w-12 h-12 text-amber-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Secure & Private</h3>
                <p className="text-slate-700">
                  Your data is encrypted and private. Only you can access your stress analysis history.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={600}>
              <div className="p-8 bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl border border-rose-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <Brain className="w-12 h-12 text-rose-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Science-Backed</h3>
                <p className="text-slate-700">
                  Built on proven AI models for accurate emotion detection and stress level assessment.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-teal-200/50 to-transparent rounded-full blur-3xl animate-breathe"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200/30 via-transparent to-slate-300/30 animate-breathe-slow pointer-events-none"></div>
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <AnimatedSection animation="fade-up">
            <h2 className="text-4xl font-bold text-slate-900 text-center mb-16">How StressKE Works</h2>
          </AnimatedSection>
          <AnimatedSection animation="scale-up" delay={100}>
            <div className="bg-white rounded-2xl shadow-lg p-12 border border-slate-200">
              <div className="space-y-8">
                <AnimatedSection animation="slide-left" delay={100}>
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                      1
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Upload Your Photo</h3>
                      <p className="text-slate-700">
                        Take a quick selfie or upload a face image. Our system securely processes your image for analysis.
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="slide-right" delay={200}>
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">AI Analysis</h3>
                      <p className="text-slate-700">
                        Our advanced AI model analyzes facial expressions and micro-emotions to determine your current stress level and emotional state.
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="slide-left" delay={300}>
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                      3
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Get Your Score</h3>
                      <p className="text-slate-700">
                        Receive your stress score, emotion classification, and probability breakdown in real-time.
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="slide-right" delay={400}>
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                      4
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Get Personalized Tips</h3>
                      <p className="text-slate-700">
                        Based on your results, receive tailored recommendations and stress management strategies.
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="slide-left" delay={500}>
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                      5
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Track Over Time</h3>
                      <p className="text-slate-700">
                        Save your results and track your stress patterns over days and weeks. Identify trends and improvements.
                      </p>
                    </div>
                  </div>
                </AnimatedSection>
              </div>

              <AnimatedSection animation="fade-up" delay={600}>
                <div className="mt-12 text-center">
                  <button
                    onClick={onGetStarted}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-2 mx-auto shadow-lg"
                  >
                    <Activity className="w-5 h-5" />
                    Get Your Stress Score
                  </button>
                </div>
              </AnimatedSection>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section id="testimonials" className="py-20 bg-gradient-to-br from-cyan-50 to-blue-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-teal-200/40 to-transparent rounded-full blur-3xl animate-breathe"></div>
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <AnimatedSection animation="fade-up">
            <h2 className="text-4xl font-bold text-slate-900 text-center mb-4">
              What Our Users Say
            </h2>
            <p className="text-slate-600 text-center mb-16 max-w-2xl mx-auto">
              Join thousands of users who have transformed their stress management with StressKE
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatedSection animation="fade-up" delay={100}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  "StressKE has been a game-changer for me. Being able to track my stress levels daily has helped me identify patterns and take control of my mental health."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    SM
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Sarah Mitchell</h4>
                    <p className="text-sm text-slate-600">Marketing Manager</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  "The AI analysis is incredibly accurate and fast. I love how I can get instant feedback on my stress levels and receive personalized recommendations."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                    JK
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">James Kariuki</h4>
                    <p className="text-sm text-slate-600">Software Engineer</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={300}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  "As a healthcare professional, I appreciate the science-based approach. StressKE has helped me manage my own stress and I recommend it to my patients."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                    AM
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Dr. Amina Mwangi</h4>
                    <p className="text-sm text-slate-600">Clinical Psychologist</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-200/35 via-blue-200/35 to-teal-200/35 rounded-full blur-3xl animate-breathe"></div>
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <AnimatedSection animation="fade-up">
            <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
              The StressKE Difference
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <AnimatedSection animation="slide-left" delay={100}>
                <div className="flex gap-4">
                  <CheckCircle className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Science-Based Accuracy</h4>
                    <p className="text-slate-700">Built on validated AI models trained on thousands of facial expressions</p>
                  </div>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="slide-left" delay={200}>
                <div className="flex gap-4">
                  <CheckCircle className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Instant Results</h4>
                    <p className="text-slate-700">Get your stress analysis in seconds, not days</p>
                  </div>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="slide-left" delay={300}>
                <div className="flex gap-4">
                  <CheckCircle className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Privacy First</h4>
                    <p className="text-slate-700">Your data is encrypted and never shared with third parties</p>
                  </div>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="slide-left" delay={400}>
                <div className="flex gap-4">
                  <CheckCircle className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Comprehensive Analytics</h4>
                    <p className="text-slate-700">Track trends, patterns, and improvements over time</p>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            <AnimatedSection animation="scale-up" delay={200}>
              <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-8 border border-cyan-200 hover:shadow-xl transition-shadow duration-300">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-cyan-600">92%</div>
                      <p className="text-sm text-slate-600">Accuracy Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-teal-600">&lt;2s</div>
                      <p className="text-sm text-slate-600">Analysis Time</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">∞</div>
                      <p className="text-sm text-slate-600">Data Storage</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-600">24/7</div>
                      <p className="text-sm text-slate-600">Availability</p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-600 text-sm mt-6 text-center leading-relaxed">
                  StressKE is trusted by thousands of users seeking to understand and manage their stress levels more effectively.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-300 py-12 border-t border-slate-700">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <AnimatedSection animation="fade-up" delay={100}>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-6 h-6 text-cyan-400" />
                  <span className="text-lg font-bold text-white">StressKE</span>
                </div>
                <p className="text-sm text-slate-400">
                  AI-powered stress detection for better mental health awareness.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200}>
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">How It Works</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Pricing</a></li>
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={300}>
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Contact</a></li>
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={400}>
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms & Conditions</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection animation="fade-in" delay={500}>
            <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
              <p>&copy; 2024 StressKE. All rights reserved.</p>
            </div>
          </AnimatedSection>
        </div>
      </footer>
    </div>
  );
}
