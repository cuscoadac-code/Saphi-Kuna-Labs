/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Leaf, 
  Bot, 
  ShieldCheck, 
  Globe, 
  Microscope, 
  Headset, 
  ShoppingCart, 
  ArrowRight, 
  Wand2, 
  Star, 
  Check, 
  UserPlus, 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin,
  Send,
  Loader2,
  X,
  MessageSquare,
  ChevronDown,
  FlaskConical,
  Sprout,
  Factory,
  Phone,
  Calendar,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';

// Initialize Gemini
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Logo = ({ className = "", light = false }: { className?: string, light?: boolean }) => (
  <a href="#" className={cn("flex items-center gap-3 group transition-all", className)}>
    <div className="relative w-11 h-11 flex items-center justify-center">
      <div className={cn(
        "absolute inset-0 rounded-xl rotate-6 transition-all duration-500 group-hover:rotate-12",
        light ? "bg-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "bg-emerald-600/10"
      )} />
      <div className={cn(
        "absolute inset-0 rounded-xl -rotate-6 transition-all duration-500 group-hover:-rotate-12",
        light ? "bg-emerald-400/10" : "bg-emerald-600/5"
      )} />
      <div className="relative z-10 flex items-center justify-center">
        <FlaskConical className={cn("w-6 h-6 transition-transform duration-500 group-hover:scale-110", light ? "text-emerald-400" : "text-emerald-600")} />
      </div>
      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
    </div>
    <div className="flex flex-col leading-none">
      <span className={cn(
        "font-display font-black text-2xl tracking-tighter uppercase",
        light ? "text-white" : "text-gray-900"
      )}>
        SAPHI<span className={light ? "text-emerald-400" : "text-emerald-600"}>KUNA</span>
      </span>
      <div className="flex items-center gap-1.5 mt-0.5">
        <div className={cn("h-[1px] w-4", light ? "bg-emerald-400/40" : "bg-emerald-600/40")} />
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-[0.4em]",
          light ? "text-emerald-400/70" : "text-emerald-600/70"
        )}>
          Bio-Tech Labs
        </span>
      </div>
    </div>
  </a>
);

export default function App() {
  const { session, signOut } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  // New States for Database & Yape
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isYapeOpen, setIsYapeOpen] = useState(false);
  
  // Form States
  const [skinType, setSkinType] = useState('');
  const [goal, setGoal] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const loadCart = async () => {
    if (!session) return;
    const { data, error } = await supabase.from('cart_items').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (!error && data) setCartItems(data);
  };

  useEffect(() => {
    if (session) loadCart();
    else setCartItems([]);
  }, [session]);

  const handleAddToCart = async (product: any) => {
    if (!session) {
      showToast("Debes iniciar sesión para comprar");
      setIsLoginOpen(true);
      return;
    }
    const priceNumber = parseFloat(product.price.replace('S/ ', '').replace(',', ''));
    const { error } = await supabase.from('cart_items').insert({
      user_id: session.user.id,
      product_name: product.name,
      price: priceNumber,
      quantity: 1
    });
    if (error) {
      showToast("Error al añadir al carrito");
    } else {
      showToast("Producto añadido al carrito");
      loadCart();
    }
  };

  const handleAuth = async () => {
    if (!authEmail || !authPassword) {
      showToast("Ingresa email y contraseña");
      return;
    }
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        showToast("¡Registro exitoso! Revisa tu email para confirmar.");
        setIsLoginOpen(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        showToast("Sesión iniciada correctamente.");
        setIsLoginOpen(false);
      }
    } catch (error: any) {
      showToast(error.message || "Ocurrió un error.");
    } finally {
      setAuthLoading(false);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || userInput;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: messageToSend };
    setChatHistory(prev => [...prev, userMessage]);
    if (!customMessage) setUserInput('');
    setIsLoading(true);
    setIsChatOpen(true);

    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "Eres Pachamama GPT, el asistente experto de Saphi Kuna Labs. Tu misión es asesorar sobre cosmética natural peruana. Conoces profundamente ingredientes como la quinoa, sacha inchi, cacao, hoja de coca, aguaymanto, etc. Ayudas a los usuarios a crear fórmulas personalizadas basadas en su tipo de piel (seca, grasa, mixta, sensible). Eres amable, profesional y apasionado por la biodiversidad peruana. Responde siempre en español.",
        },
        history: chatHistory.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }))
      });

      const response = await chat.sendMessage({ message: messageToSend });
      const responseText = response.text || 'Lo siento, no pude procesar tu solicitud.';
      const modelMessage: Message = { role: 'model', text: responseText };
      setChatHistory(prev => [...prev, modelMessage]);

      if (session && messageToSend.includes("generar una fórmula personalizada")) {
        await supabase.from('formulas').insert({
          user_id: session.user.id,
          skin_type: skinType || 'No especificado',
          goal: goal || 'No especificado',
          ingredients: ingredients.length > 0 ? ingredients : ['Ninguno'],
          response: responseText
        });
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setChatHistory(prev => [...prev, { role: 'model', text: 'Hubo un error al conectar con Pachamama GPT. Por favor, intenta de nuevo.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFormula = () => {
    if (!skinType || !goal || ingredients.length === 0) {
      showToast("Por favor completa todos los campos marcados con *");
      return;
    }
    const prompt = `Hola Pachamama GPT, me gustaría generar una fórmula personalizada. Mi tipo de piel es ${skinType}, mi objetivo es ${goal} y me gustaría incluir estos ingredientes: ${ingredients.join(', ')}. ¿Qué me recomiendas?`;
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-white selection:bg-emerald-100 selection:text-emerald-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#inicio" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">Inicio</a>
            <a href="#productos" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">Productos</a>
            <a href="#laboratorios" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">Para Laboratorios</a>
            <a href="#nosotros" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">Nosotros</a>
          </nav>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="text-gray-600 hover:text-emerald-600 transition-colors p-2"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            {session ? (
              <button 
                onClick={signOut}
                className="bg-emerald-100 text-emerald-800 px-5 py-2 rounded-full text-sm font-semibold hover:bg-emerald-200 transition-all shadow-md active:scale-95 border border-emerald-200"
              >
                Cerrar Sesión
              </button>
            ) : (
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1920&auto=format&fit=crop" 
            alt="Hero Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-6 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-white mb-8 leading-[0.9] tracking-tighter uppercase"
          >
            Cosméticos<br />
            <span className="text-emerald-400">Bio-Tech</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-200 mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            Descubre la perfecta fusión entre la sabiduría ancestral peruana y la tecnología moderna. 
            Crea fórmulas cosméticas personalizadas con nuestro revolucionario Pachamama GPT.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <a href="#productos" className="bg-emerald-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl hover:shadow-emerald-500/20">
              Explorar Productos <ArrowRight className="w-5 h-5" />
            </a>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="bg-white/10 backdrop-blur-md border-2 border-white text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-white hover:text-gray-900 transition-all flex items-center gap-2"
            >
              <Bot className="w-5 h-5" /> Probar Pachamama GPT
            </button>
          </motion.div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-custom text-white">
          <ChevronDown className="w-8 h-8" />
        </div>
      </section>

      {/* WHY US */}
      <section id="nosotros" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-display font-black text-gray-900 mb-4 tracking-tight uppercase">
              ¿Por qué elegir <span className="text-emerald-600">Saphi Kuna</span>?
            </h2>
            <div className="h-1 w-20 bg-emerald-600 mx-auto mb-6 rounded-full" />
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Combinamos lo mejor de la tradición peruana con la innovación tecnológica para ofrecerte productos únicos y personalizados.
            </p>
          </div>

          <div className="space-y-24">
            {[
              {
                title: "Ingredientes Naturales Peruanos",
                desc: "Utilizamos ingredientes ancestrales como quinoa, sacha inchi, cacao y hoja de coca, respaldados por investigación científica moderna.",
                icon: Leaf,
                img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
                reverse: false
              },
              {
                title: "Inteligencia Artificial Avanzada",
                desc: "Nuestro Pachamama GPT genera fórmulas cosméticas personalizadas basadas en tu tipo de piel y necesidades específicas.",
                icon: Bot,
                img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
                reverse: true
              },
              {
                title: "Calidad Certificada",
                desc: "Todos nuestros productos cumplen con estándares internacionales de calidad y son dermatológicamente probados.",
                icon: ShieldCheck,
                img: "https://images.unsplash.com/photo-1579154341098-e4e158cc7f55?w=800&q=80",
                reverse: false
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-12",
                  feature.reverse && "md:flex-row-reverse"
                )}
              >
                <div className="flex-1">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
                <div className="flex-1 w-full">
                  <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl group">
                    <img 
                      src={feature.img} 
                      alt={feature.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="productos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-black text-gray-900 mb-4 tracking-tight uppercase">
              Nuestros Productos <span className="text-emerald-600">Destacados</span>
            </h2>
            <div className="h-1 w-20 bg-emerald-600 mx-auto mb-6 rounded-full" />
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Descubre nuestra selección de cosméticos naturales peruanos, formulados con ingredientes de la más alta calidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                name: "Serum de Quinoa Hidratante",
                desc: "Serum hidratante con extracto de quinoa andina para todo tipo de piel.",
                price: "S/ 89.90",
                rating: 4.8,
                img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80"
              },
              {
                name: "Crema Facial de Sacha Inchi",
                desc: "Crema nutritiva con aceite de sacha inchi, rica en omega 3 y vitamina E.",
                price: "S/ 125.90",
                rating: 4.9,
                img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80"
              },
              {
                name: "Mascarilla de Cacao Regeneradora",
                desc: "Mascarilla revitalizante con cacao peruano y antioxidantes naturales.",
                price: "S/ 69.90",
                rating: 4.7,
                img: "https://images.unsplash.com/photo-1601049676869-702ea24cfd58?w=600&q=80"
              }
            ].map((product, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden"
              >
                <div className="aspect-square overflow-hidden">
                  <img src={product.img} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("w-4 h-4 fill-current", i >= Math.floor(product.rating) && "text-gray-300 fill-none")} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">({product.rating})</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">{product.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-emerald-600">{product.price}</span>
                    <button 
                      onClick={() => setSelectedProduct(product)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Ver Producto
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <button 
              onClick={() => showToast("Cargando más productos...")}
              className="bg-gray-900 text-white px-8 py-4 rounded-full font-bold hover:bg-gray-800 transition-all flex items-center gap-2 mx-auto"
            >
              Ver Todos los Productos <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* PACHAMAMA GPT CTA SECTION */}
      <section className="py-24 bg-emerald-950 text-white overflow-hidden relative border-y border-emerald-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#10b981 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-400/20 text-emerald-300 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-emerald-400/30">
                <Bot className="w-4 h-4" /> TECNOLOGÍA PROPIA
              </div>
              <h2 className="text-4xl md:text-6xl font-display font-black mb-8 leading-tight uppercase tracking-tighter">
                PACHAMAMA <span className="text-emerald-400">GPT</span>
              </h2>
              <p className="text-xl text-emerald-100/80 mb-10 leading-relaxed max-w-xl">
                Nuestra revolucionaria herramienta de inteligencia artificial genera fórmulas cosméticas personalizadas 
                usando ingredientes peruanos ancestrales y tus ingredientes preferidos.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Análisis de tipo de piel con IA",
                  "Fórmulas personalizadas en segundos",
                  "Base de datos de ingredientes peruanos",
                  "Exportación para laboratorios"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="bg-emerald-400 text-emerald-900 rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-emerald-50 text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="bg-white text-emerald-900 px-8 py-4 rounded-full font-bold hover:bg-emerald-50 transition-all flex items-center gap-2"
                >
                  <Wand2 className="w-5 h-5" /> Probar Gratis
                </button>
                <button 
                  onClick={() => showToast("Acceso a laboratorios próximamente")}
                  className="border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-emerald-900 transition-all"
                >
                  Para Laboratorios
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl">
                <div className="bg-white rounded-2xl p-8 text-gray-900">
                  <h3 className="text-xl font-bold mb-6">Genera tu fórmula personalizada</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de piel <span className="text-red-500">*</span></label>
                      <select 
                        value={skinType}
                        onChange={(e) => setSkinType(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl flex items-center justify-between text-gray-700 cursor-pointer hover:border-emerald-400 transition-colors outline-none appearance-none bg-white"
                      >
                        <option value="">Selecciona tu tipo de piel</option>
                        <option value="Seca">Seca</option>
                        <option value="Grasa">Grasa</option>
                        <option value="Mixta">Mixta</option>
                        <option value="Sensible">Sensible</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Objetivo del producto <span className="text-red-500">*</span></label>
                      <select 
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl flex items-center justify-between text-gray-700 cursor-pointer hover:border-emerald-400 transition-colors outline-none appearance-none bg-white"
                      >
                        <option value="">Selecciona el objetivo</option>
                        <option value="Hidratación">Hidratación</option>
                        <option value="Anti-edad">Anti-edad</option>
                        <option value="Limpieza profunda">Limpieza profunda</option>
                        <option value="Luminosidad">Luminosidad</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ingredientes preferidos <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-2">
                        {['Quinoa', 'Sacha Inchi', 'Cacao', 'Coca', 'Aguaymanto'].map((ing) => (
                          <button
                            key={ing}
                            onClick={() => {
                              setIngredients(prev => 
                                prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
                              );
                            }}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium transition-all",
                              ingredients.includes(ing) 
                                ? "bg-emerald-600 text-white" 
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                          >
                            {ing}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={handleGenerateFormula}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                        (skinType && goal && ingredients.length > 0) 
                          ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                          : "bg-gray-400 text-white cursor-not-allowed"
                      )}
                    >
                      <Wand2 className="w-5 h-5" /> Generar Fórmula con IA
                    </button>
                    <p className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Resultados en menos de 15 segundos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="laboratorios" className="py-24 bg-[#0A192F] relative overflow-hidden border-t border-white/5">
        <div className="pricing-blob top-20 left-10 w-72 h-72 bg-emerald-400/10" />
        <div className="pricing-blob bottom-20 right-10 w-96 h-96 bg-blue-400/10" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#00F5D4]/10 text-[#00F5D4] px-4 py-2 rounded-full text-sm font-bold mb-6 border border-[#00F5D4]/20">
              <Factory className="w-4 h-4" /> SOLUCIONES INDUSTRIALES
            </div>
            <h2 className="text-4xl md:text-6xl font-display font-black text-[#00F5D4] mb-4 uppercase tracking-tighter">
              PLANES <span className="text-white">LAB</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Desde startups hasta grandes corporaciones, tenemos la solución perfecta para potenciar tu laboratorio con ingredientes peruanos de vanguardia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {[
              {
                title: "Starter",
                tag: "Perfecto para emprendedores",
                price: "$99",
                icon: Sprout,
                features: ["Hasta 25 fórmulas por mes", "Base de datos de 100 ingredientes", "Fichas técnicas básicas", "Soporte por email", "1 usuario incluido"]
              },
              {
                title: "Professional",
                tag: "La opción más popular",
                price: "$299",
                icon: FlaskConical,
                popular: true,
                features: ["Fórmulas ilimitadas", "Base de datos completa (500+)", "Simulación de estabilidad", "Análisis predictivo con IA", "Hasta 5 usuarios", "Soporte prioritario"]
              },
              {
                title: "Enterprise",
                tag: "Solución corporativa completa",
                price: "$799",
                icon: Factory,
                features: ["Todo lo de Professional", "Usuarios ilimitados", "Integración ERP", "Consultoría técnica dedicada", "SLA garantizado 99.9%", "Desarrollo custom"]
              }
            ].map((plan, idx) => (
              <div 
                key={idx}
                className={cn(
                  "bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-3xl flex flex-col relative transition-all duration-300 group hover:border-emerald-400/30",
                  plan.popular && "border-emerald-400 border-2 scale-105 shadow-2xl shadow-emerald-400/10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00F5D4] text-[#0A192F] px-6 py-1 rounded-full text-sm font-bold">
                    Más Popular
                  </div>
                )}
                <div className="w-16 h-16 bg-emerald-400/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <plan.icon className="w-8 h-8 text-[#00F5D4]" />
                </div>
                <h3 className="text-2xl font-bold text-white text-center mb-2">{plan.title}</h3>
                <p className="text-gray-400 text-center text-sm mb-8">{plan.tag}</p>
                <div className="text-center mb-8">
                  <span className="text-5xl font-bold text-[#00F5D4]">{plan.price}</span>
                  <span className="text-gray-400 ml-2">/mes</span>
                </div>
                <div className="border-t border-white/10 my-6" />
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-[#00F5D4] mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => showToast(`Plan ${plan.title} seleccionado`)}
                  className={cn(
                  "w-full py-4 rounded-xl font-bold transition-all",
                  plan.popular ? "bg-[#00F5D4] text-[#0A192F] hover:bg-[#00d4b8]" : "border border-[#00F5D4] text-[#00F5D4] hover:bg-emerald-400/10"
                )}>
                  {plan.popular ? "Comenzar Ahora" : "Seleccionar Plan"}
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            {[
              { icon: Clock, title: "Prueba Gratuita", desc: "14 días sin compromiso" },
              { icon: Microscope, title: "Soporte Químico", desc: "Expertos a tu disposición" },
              { icon: ShieldCheck, title: "Garantía Total", desc: "30 días de devolución" },
              { icon: Globe, title: "Actualizaciones", desc: "Nuevas funciones siempre" }
            ].map((perk, i) => (
              <div key={i} className="bg-white/5 p-6 rounded-2xl text-center border border-white/5">
                <perk.icon className="w-8 h-8 text-[#00F5D4] mx-auto mb-4" />
                <h4 className="text-white font-bold mb-1">{perk.title}</h4>
                <p className="text-gray-400 text-xs">{perk.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-emerald-400/10 to-blue-400/10 border border-emerald-400/20 p-12 rounded-[2.5rem] text-center">
            <h3 className="text-3xl font-bold text-[#00F5D4] mb-4">¿Necesitas un Plan Personalizado?</h3>
            <p className="text-gray-200 text-lg max-w-2xl mx-auto mb-10">
              Ofrecemos soluciones a medida para laboratorios con necesidades específicas, incluyendo desarrollo de ingredientes exclusivos y formulaciones custom.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => showToast("Conectando con un especialista...")}
                className="bg-[#00F5D4] text-[#0A192F] px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-[#00d4b8] transition-all"
              >
                <Phone className="w-5 h-5" /> Hablar con Especialista
              </button>
              <button 
                onClick={() => showToast("Abriendo calendario de demos...")}
                className="border border-[#00F5D4] text-[#00F5D4] px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400/10 transition-all"
              >
                <Calendar className="w-5 h-5" /> Agendar Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-black text-gray-900 mb-4 tracking-tight uppercase">
              VOCES DE LA <span className="text-emerald-600">COMUNIDAD</span>
            </h2>
            <div className="h-1 w-20 bg-emerald-600 mx-auto mb-6 rounded-full" />
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Miles de personas confían en Saphi Kuna Labs para el cuidado de su piel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "María Elena Cortés",
                role: "Dermatóloga",
                text: "Los productos de Saphi Kuna Labs han revolucionado mi práctica. La combinación de ingredientes peruanos tradicionales con formulaciones científicas modernas ofrece resultados excepcionales.",
                img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&q=80"
              },
              {
                name: "Ana Lucía Rodriguez",
                role: "Cliente Satisfecha",
                text: "Llevo 6 meses usando el serum de quinoa y mi piel nunca había estado mejor. Pachamama GPT me ayudó a encontrar la rutina perfecta para mi tipo de piel.",
                img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&q=80"
              },
              {
                name: "Dr. Carlos Mendoza",
                role: "Director de Laboratorio",
                text: "Como laboratorio, Pachamama GPT nos ha permitido acelerar nuestro proceso de formulación significativamente. La base de datos de ingredientes peruanos es invaluable.",
                img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&q=80"
              }
            ].map((testi, idx) => (
              <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <img src={testi.img} alt={testi.name} className="w-14 h-14 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <h4 className="font-bold text-gray-900">{testi.name}</h4>
                    <p className="text-sm text-gray-500">{testi.role}</p>
                  </div>
                </div>
                <div className="flex text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <blockquote className="text-gray-600 italic leading-relaxed">
                  "{testi.text}"
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <Logo light className="mb-8" />
              <p className="text-gray-400 text-lg mb-8 max-w-md leading-relaxed">
                Plataforma líder en cosméticos naturales peruanos y generación de fórmulas personalizadas con inteligencia artificial. 
                Conectamos la tradición ancestral con la tecnología moderna.
              </p>
              <div className="flex gap-4">
                {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-6">Productos</h3>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Cremas Faciales</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Serums</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Limpiadores</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Mascarillas</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-6">Servicios</h3>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Pachamama GPT</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Para Laboratorios</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Consultoría</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Soporte</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-500 text-sm">© 2024 Saphi Kuna Labs. Todos los derechos reservados.</p>
            <div className="flex gap-8 text-sm text-gray-500">
              <a href="#" className="hover:text-emerald-400 transition-colors">Política de Privacidad</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">Términos de Uso</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS & DRAWERS */}
      <AnimatePresence>
        {/* Toast */}
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-400" /> {toast}
          </motion.div>
        )}

        {/* Cart Drawer */}
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 w-full md:w-[400px] h-full bg-white z-[90] shadow-2xl p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Tu Carrito</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                {!session ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <h4 className="text-xl font-bold mb-2">Inicia Sesión</h4>
                    <p className="text-gray-500 mb-8">Debes iniciar sesión para ver tu carrito.</p>
                    <button onClick={() => { setIsCartOpen(false); setIsLoginOpen(true); }} className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-700">Iniciar Sesión</button>
                  </div>
                ) : cartItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <ShoppingCart className="w-10 h-10 text-gray-400" />
                    </div>
                    <h4 className="text-xl font-bold mb-2">Tu carrito está vacío</h4>
                    <p className="text-gray-500 mb-8">¡Explora nuestros productos y encuentra algo especial para tu piel!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div>
                            <h5 className="font-bold text-gray-900">{item.product_name}</h5>
                            <p className="text-emerald-600 font-semibold">S/ {Number(item.price).toFixed(2)}</p>
                          </div>
                          <button onClick={async () => {
                            await supabase.from('cart_items').delete().eq('id', item.id);
                            loadCart();
                          }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><X className="w-5 h-5"/></button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 pt-6 mt-4">
                      <div className="flex justify-between items-center mb-6">
                        <span className="font-bold text-lg">Total a Pagar</span>
                        <span className="font-black text-3xl text-[#740F6B]">S/ {cartItems.reduce((acc, item) => acc + Number(item.price), 0).toFixed(2)}</span>
                      </div>
                      <button onClick={() => { setIsCartOpen(false); setIsYapeOpen(true); }} className="w-full bg-[#00E4B0] text-[#740F6B] py-4 rounded-xl font-black text-lg hover:bg-[#00c99b] transition-all flex justify-center items-center gap-2">
                        Pagar con Yape
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Yape Modal */}
        {isYapeOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsYapeOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[400px] bg-white z-[90] shadow-2xl rounded-3xl overflow-hidden"
            >
              <div className="bg-[#740F6B] p-6 text-white text-center relative">
                <button onClick={() => setIsYapeOpen(false)} className="absolute right-4 top-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
                <div className="bg-[#00E4B0] w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                  <span className="font-black text-[#740F6B] text-2xl">Y</span>
                </div>
                <h3 className="text-xl font-bold">Paga con Yape</h3>
              </div>
              <div className="p-8 flex flex-col items-center text-center">
                <p className="text-gray-500 mb-6">Escanea el código QR desde tu aplicación para transferir <strong className="text-gray-900">S/ {cartItems.reduce((acc, item) => acc + Number(item.price), 0).toFixed(2)}</strong>.</p>
                
                <div className="bg-white p-3 rounded-2xl mb-6 shadow-md border-4 border-[#00E4B0]">
                  <img src="/yape-qr.jpg" alt="QR Yape" className="w-48 h-48 rounded-xl object-contain" />
                </div>
                
                <div className="bg-[#740F6B]/5 rounded-2xl p-4 w-full mb-6 border border-[#740F6B]/10">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Titular</p>
                  <p className="font-bold text-[#740F6B] truncate">Engelberth Paolo Egoavil Palomino</p>
                  <p className="text-xs text-gray-500 mt-4 mb-1 uppercase tracking-wider font-semibold">Celular</p>
                  <p className="font-black text-[#740F6B] text-2xl tracking-widest">958 050 928</p>
                </div>
                
                <a 
                  href={`https://wa.me/51958050928?text=Hola%20Paolo,%20acabo%20de%20realizar%20un%20pago%20por%20Yape%20de%20S/%20${cartItems.reduce((acc, item) => acc + Number(item.price), 0).toFixed(2)}%20por%20mis%20productos%20en%20Saphi%20Kuna%20Labs.%20Adjunto%20mi%20comprobante:`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#00E4B0] text-[#740F6B] py-4 rounded-xl font-black text-lg hover:bg-[#00c99b] transition-all flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95"
                >
                  Confirmar por WhatsApp
                </a>
              </div>
            </motion.div>
          </>
        )}

        {/* Login Modal */}
        {isLoginOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[450px] bg-white z-[90] shadow-2xl p-8 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</h3>
                <button onClick={() => setIsLoginOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="tu@email.com" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                  <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <button 
                  onClick={handleAuth}
                  disabled={authLoading}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Registrarse' : 'Entrar')}
                </button>
                <div className="text-center text-sm text-gray-500">
                  {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'} <button onClick={() => setIsSignUp(!isSignUp)} className="text-emerald-600 font-bold hover:underline transition-colors">{isSignUp ? 'Inicia Sesión' : 'Regístrate'}</button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Product Detail Modal */}
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] md:w-[800px] bg-white z-[90] shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row"
            >
              <div className="flex-1 h-[300px] md:h-auto">
                <img src={selectedProduct.img} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 p-8 md:p-12 flex flex-col">
                <button onClick={() => setSelectedProduct(null)} className="self-end p-2 hover:bg-gray-100 rounded-full transition-colors mb-4">
                  <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("w-4 h-4 fill-current", i >= Math.floor(selectedProduct.rating) && "text-gray-300 fill-none")} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">({selectedProduct.rating})</span>
                </div>
                <h3 className="text-3xl font-bold mb-4">{selectedProduct.name}</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">{selectedProduct.desc}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-3xl font-bold text-emerald-600">{selectedProduct.price}</span>
                  <button 
                    onClick={() => showToast("Producto añadido al carrito")}
                    className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    Añadir al Carrito <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* CHAT INTERFACE */}
        {isChatOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />
            
            {/* Chat Window */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-6 right-6 w-[90vw] md:w-[450px] h-[600px] bg-white rounded-3xl shadow-2xl z-[70] flex flex-col overflow-hidden border border-gray-100"
            >
              {/* Header */}
              <div className="bg-emerald-600 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Pachamama GPT</h3>
                    <p className="text-emerald-100 text-xs flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" /> En línea
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                {chatHistory.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h4 className="text-gray-900 font-bold mb-2">¡Hola! Soy Pachamama GPT</h4>
                    <p className="text-gray-500 text-sm max-w-[250px] mx-auto">
                      ¿En qué puedo ayudarte hoy? Puedo recomendarte ingredientes peruanos o ayudarte con una fórmula.
                    </p>
                  </div>
                )}
                {chatHistory.map((msg, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl shadow-sm",
                      msg.role === 'user' 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                    )}>
                      <div className="markdown-body">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <input 
                    type="text" 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Escribe tu consulta aquí..."
                    className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={!userInput.trim() || isLoading}
                    className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-2xl z-50 hover:bg-emerald-700 transition-all group"
      >
        <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </motion.button>
    </div>
  );
}
