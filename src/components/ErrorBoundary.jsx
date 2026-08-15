// src/components/ErrorBoundary.jsx
import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error("Error pada komponen katalog:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="text-center py-20 px-4">
                    <p className="text-lg font-bold text-slate-800 mb-2">
                        Terjadi kendala saat memuat katalog.
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                        Silakan muat ulang halaman. Jika tetap muncul, hubungi kami.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg text-sm"
                    >
                        Muat Ulang
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
