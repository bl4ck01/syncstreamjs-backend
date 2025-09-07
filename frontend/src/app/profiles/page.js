import { getProfiles } from '@/server/actions';
import ProfileList from '@/components/ProfileList';

export default async function Profiles() {
    // Fetch profiles from the server
    const profilesResponse = await getProfiles();
    
    if (!profilesResponse.success) {
        return (
            <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                <div className="text-center">
                    <h1 className="text-2xl text-white mb-4">Error Loading Profiles</h1>
                    <p className="text-gray-400">{profilesResponse.message}</p>
                </div>
            </div>
        );
    }

    const profiles = profilesResponse.data || [];


    const handleProfileClick = (profile) => {
        if (profile.hasPin) {
            setSelectedProfile(profile);
            setShowPinModal(true);
            setPin(['', '', '', '']);
            setActivePinIndex(0);
        } else {
            // Handle profile selection without PIN
            console.log('Selected profile:', profile.name);
        }
    };

    const handlePinChange = (value, index) => {
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        if (value && index < 3) {
            setActivePinIndex(index + 1);
        } else if (value && index === 3) {
            setTimeout(() => {
                const pinString = newPin.join('');
                if (pinString.length === 4 && selectedProfile) {
                    handlePinSubmitWithPin(pinString);
                }
            }, 100);
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            setActivePinIndex(index - 1);
        }
    };

    const handlePinSubmitWithPin = async (pinString) => {
        // Validate PIN with Zod
        try {
            pinSchema.parse(pinString);
        } catch (error) {
            if (error instanceof z.ZodError && error.errors && error.errors.length > 0) {
                toast.error(error.errors[0].message);
                return;
            } else {
                toast.error('Invalid PIN format');
                return;
            }
        }

        if (pinString.length === 4 && selectedProfile) {
            setIsSubmitting(true);

            try {
                // Call the selectProfile function with the PIN
                const result = await selectProfile(selectedProfile.id, pinString);

                if (result.success) {
                    // Successfully selected profile
                    toast.success('Profile selected successfully!');
                    setShowPinModal(false);
                    setSelectedProfile(null);
                    setPin(['', '', '', '']);
                    setActivePinIndex(0);
                    // You might want to redirect or update the UI here
                } else {
                    // Handle error from backend
                    toast.error(result.message || 'Invalid PIN. Please try again.');
                }
            } catch (error) {
                console.error('Error selecting profile:', error);
                toast.error('An error occurred. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handlePinSubmit = async () => {
        const pinString = pin.join('');
        await handlePinSubmitWithPin(pinString);
    };

    const closePinModal = () => {
        setShowPinModal(false);
        setSelectedProfile(null);
        setPin(['', '', '', '']);
        setActivePinIndex(0);
        setIsSubmitting(false);
    };

    return (
        <div className='relative h-screen flex flex-col items-center justify-center overflow-hidden'>

            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-screen z-[1]">
                <div className="relative w-full h-full rounded-3xl overflow-hidden">
                    <RadialHalftone
                        widthPercent={100}
                        heightPercent={100}
                        dotColor="#9CA3AF60"   // gray-400/30 color
                        backgroundColor="#000000"
                        centerX={0.4}
                        centerY={-0.1}
                        innerRadius={0.2}
                        outerRadius={1.5}
                        dotSize={2}
                        dotSpacing={8}
                    />
                </div>
            </div>

            <div className="relative flex flex-col items-center justify-center z-10">
                <motion.h1
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.4, delay: 0.2 }}
                    variants={{
                        hidden: { filter: "blur(10px)", opacity: 0 },
                        visible: { filter: "blur(0px)", opacity: 1 },
                    }}
                    className="text-5xl sm:text-6xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold"
                >
                    Who&apos;s watching?
                </motion.h1>
                <motion.p
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.4, delay: 0.3 }}
                    variants={{
                        hidden: { filter: "blur(10px)", opacity: 0 },
                        visible: { filter: "blur(0px)", opacity: 1 },
                    }}
                    className="text-neutral-500 my-2 text-sm md:text-base lg:text-lg text-center"
                >
                    Select a profile to continue or create a new one
                </motion.p>

                <div className="mt-16 mx-10 px-4 flex flex-wrap justify-center items-center gap-6 sm:gap-8">
                    {
                        profiles.map((profile, index) => (
                            <motion.div
                                key={index}
                                initial="hidden"
                                animate="visible"
                                transition={{ duration: 0.5, delay: 0.25 + index * 0.09 }}
                                variants={{
                                    hidden: { filter: "blur(10px)", opacity: 0 },
                                    visible: { filter: "blur(0px)", opacity: 1 },
                                }}
                                className="flex flex-col items-center cursor-pointer group"
                                onClick={() => handleProfileClick(profile)}
                            >
                                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-md border border-gray-800 hover:border-2 hover:border-gray-400 transition-transform duration-300 hover:scale-105 relative overflow-hidden"
                                    style={{
                                        backgroundImage: `url(${profile.avatar})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat'
                                    }}
                                >
                                </div>
                                <div className="flex items-center gap-2 mt-5 text-white font-medium text-sm sm:text-base text-center">
                                    {profile.hasPin ?
                                        <LockKeyhole className="w-4 h-4" /> :
                                        null
                                    }
                                    {profile.name}
                                </div>
                            </motion.div>
                        ))
                    }
                </div>

                {/* Manage Profiles Button */}
                <motion.button
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.5, delay: 0.5 }}
                    variants={{
                        hidden: { filter: "blur(10px)", opacity: 0 },
                        visible: { filter: "blur(0px)", opacity: 1 },
                    }}
                    className="mt-12 px-8 py-3 border border-white/30 text-white font-medium text-sm hover:border-white/50 hover:bg-white/5 transition-all duration-300 rounded-md"
                >
                    Manage Profiles
                </motion.button>
            </div>

            {/* PIN Modal */}
            <AnimatePresence>
                {showPinModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black z-50 flex items-center justify-center"
                    >
                        {/* Close button */}
                        <button
                            onClick={closePinModal}
                            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Modal content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="text-center px-8"
                        >
                            {/* Profile Avatar */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="mb-8"
                            >
                                <div
                                    className="w-36 h-36 mx-auto rounded overflow-hidden"
                                    style={{
                                        backgroundImage: `url(${selectedProfile.avatar})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat'
                                    }}
                                />
                            </motion.div>

                            {/* Profile Lock message */}
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="text-white/70 text-sm mb-2"
                            >
                                Profile Lock is currently on.
                            </motion.p>

                            {/* Main message */}
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                                className="text-white text-2xl font-semibold mb-12"
                            >
                                Enter your PIN to access this profile.
                            </motion.h2>

                            {/* PIN Input */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.4 }}
                                className="flex gap-4 justify-center mb-6"
                            >
                                {pin.map((digit, index) => (
                                    <div key={index} className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength="1"
                                            value={digit}
                                            disabled={isSubmitting}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                handlePinChange(value, index);
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, index)}
                                            ref={(input) => {
                                                if (input && index === activePinIndex && !isSubmitting) {
                                                    input.focus();
                                                }
                                            }}
                                            className={cn(
                                                "w-12 h-12 text-center text-white text-xl font-semibold bg-transparent border border-white/30 rounded-md focus:border-white focus:outline-none transition-colors",
                                                isSubmitting && "opacity-50 cursor-not-allowed"
                                            )}
                                        />
                                        {index === activePinIndex && !isSubmitting && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 border-2 border-white rounded-md pointer-events-none"
                                            />
                                        )}
                                    </div>
                                ))}
                            </motion.div>


                            {/* Loading State */}

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-center mt-3 mb-6"
                            >
                                {isSubmitting && (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                )}
                            </motion.div>


                            {/* Forgot PIN link */}
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.5 }}
                                className="mt-10 text-white hover:text-gray-300 transition-colors text-sm"
                            >
                                Forgot PIN?
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
