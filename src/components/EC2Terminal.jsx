'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Terminal and addons with no SSR
const Terminal = dynamic(() => import('xterm').then(mod => mod.Terminal), { ssr: false });
const FitAddon = dynamic(() => import('xterm-addon-fit').then(mod => mod.FitAddon), { ssr: false });
const WebLinksAddon = dynamic(() => import('xterm-addon-web-links').then(mod => mod.WebLinksAddon), { ssr: false });

export default function EC2Terminal({ instanceId, isOpen }) {
  const terminalRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!terminalRef.current || !isOpen) return;

    let terminal;
    async function initializeTerminal() {
      try {
        setIsLoading(true);
        // Initialize terminal
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: '#1a1b26',
            foreground: '#a9b1d6',
          }
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        // Open terminal in the container
        term.open(terminalRef.current);
        fitAddon.fit();

        // Mock SSH connection for now
        term.writeln('Connected to instance ' + instanceId);
        term.writeln('Welcome to EC2 Terminal');
        term.writeln('This is a mock terminal interface.');
        term.writeln('');
        term.write('$ ');

        // Store the terminal instance
        terminal = term;

        // Handle terminal input
        term.onData(data => {
          // Echo back the input for now
          term.write(data);
        });

        // Handle window resize
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        setIsLoading(false);

        return () => {
          window.removeEventListener('resize', handleResize);
          term.dispose();
        };
      } catch (err) {
        setError(err.message);
        console.error('Terminal initialization error:', err);
        setIsLoading(false);
      }
    }

    initializeTerminal();

    return () => {
      if (terminal) {
        terminal.dispose();
      }
    };
  }, [instanceId, isOpen]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-500 rounded-lg">
        Error initializing terminal: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-[400px] bg-[#1a1b26] rounded-lg flex items-center justify-center">
        <div className="text-white">Initializing terminal...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] bg-[#1a1b26] rounded-lg overflow-hidden">
      <div ref={terminalRef} className="h-full" />
    </div>
  );
}