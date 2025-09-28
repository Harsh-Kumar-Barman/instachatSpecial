// import React from 'react'
// import { useDispatch, useSelector } from 'react-redux';
// import { setSuggestedUser } from '@/features/userDetail/userDetailsSlice';
// import { ScrollArea } from '../ui/scroll-area';
// import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
// import { SearchDialogWithCheckboxesComponent } from './search-dialog-with-checkboxes';

// function MessagesMember({ socketRef }) {
//     const followingUsers = useSelector((state) => state.counter.followingUsers);
//     const onlineUsers = useSelector((state) => state.counter.onlineUsers);
//     const dispatch = useDispatch()
//     return (
//         <>
//             {/* <SearchDialogWithCheckboxesComponent socketRef={socketRef} /> */}
//             <ScrollArea className="flex-grow">
//                 {followingUsers?.length > 0 ? (
//                     followingUsers.map((suggestedUser) => (
//                         <div onClick={() => dispatch(setSuggestedUser(suggestedUser))}
//                             key={suggestedUser._id}
//                             className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer">
//                             <div className="relative">
//                                 <Avatar className="bg-gray-200 w-14 h-14 md:w-12 md:h-12 dark:bg-neutral-950 dark:text-white">
//                                     <AvatarImage className="w-full h-full object-cover object-top" src={'groupName' in suggestedUser ? `http://localhost:5000/${suggestedUser?.groupImage}` : suggestedUser?.profilePicture} alt={`${suggestedUser?.username}'s profile`} />
//                                     <AvatarFallback>{'groupName' in suggestedUser ? `${suggestedUser.groupName}` : `${suggestedUser.username}`}</AvatarFallback>
//                                 </Avatar>
//                                 {onlineUsers?.includes(suggestedUser?._id) && (<div className="w-3 h-3 absolute top-9 left-9 border-[2px] border-white bg-green-500 rounded-full"></div>)}
//                             </div>
//                             <div className="flex-grow">
//                                 {/* <div className="text-sm md:text-sm text-black dark:text-white">{'groupName' in suggestedUser ? `${suggestedUser.groupName}` : `${suggestedUser.username}`} {`${suggestedUser.lastMessage.text}`} {`${suggestedUser.lastMessage.createdAt}`} </div> */}
//                                 <div className="flex flex-col p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
//                                     {/* Name / Group */}
//                                     <span className="font-semibold text-black dark:text-white truncate">
//                                         {'groupName' in suggestedUser ? suggestedUser.groupName : suggestedUser.username}
//                                     </span>

//                                     {/* Last message + Time on same row */}
//                                     <div className="flex justify-between items-center mt-1">
//                                         {/* Last message */}
//                                         <span className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[80%]">
//                                             {suggestedUser.lastMessage?.text || 'No messages yet'}
//                                         </span>

//                                         {/* Time */}
//                                         <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
//                                             {suggestedUser.lastMessage?.createdAt
//                                                 ? new Date(suggestedUser.lastMessage.createdAt).toLocaleString('en-IN', {
//                                                     day: '2-digit',
//                                                     month: 'short',
//                                                     hour: '2-digit',
//                                                     minute: '2-digit',
//                                                 })
//                                                 : ''}
//                                         </span>
//                                     </div>
//                                 </div>

//                                 <div className="text-xs dark:text-white flex justify-between">
//                                     {onlineUsers?.includes(suggestedUser?._id) && (
//                                         <p className="text-xs text-gray-400">Active now</p>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     ))) : (
//                     <p className="text-gray-500">No following users available.</p>
//                 )}
//             </ScrollArea>
//         </>
//     )
// }

// export default MessagesMember


import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSuggestedUser } from '@/features/userDetail/userDetailsSlice';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

function MessagesMember({ socketRef }) {
    const followingUsers = useSelector((state) => state.counter.followingUsers);
    const onlineUsers = useSelector((state) => state.counter.onlineUsers);
    const dispatch = useDispatch();
    console.log(followingUsers)

    return (
        <ScrollArea className="flex-grow">
            {followingUsers?.length > 0 ? (
                <AnimatePresence>
                    {followingUsers.map((suggestedUser) => (
                        <motion.div
                            key={suggestedUser._id}
                            layout // enables smooth movement when list reorders
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => dispatch(setSuggestedUser(suggestedUser))}
                            className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer rounded-lg"
                        >
                            <div className="relative">
                                <Avatar className="bg-gray-200 w-14 h-14 md:w-12 md:h-12 dark:bg-neutral-950 dark:text-white">
                                    <AvatarImage
                                        className="w-full h-full object-cover object-top"
                                        src={
                                            'groupName' in suggestedUser
                                                ? `http://localhost:5000/${suggestedUser?.groupImage}`
                                                : suggestedUser?.profilePicture
                                        }
                                        alt={`${suggestedUser?.username}'s profile`}
                                    />
                                    <AvatarFallback>
                                        {'groupName' in suggestedUser
                                            ? `${suggestedUser.groupName}`
                                            : `${suggestedUser.username}`}
                                    </AvatarFallback>
                                </Avatar>
                                {onlineUsers?.includes(suggestedUser?._id) && (
                                    <div className="w-3 h-3 absolute top-9 left-9 border-[2px] border-white bg-green-500 rounded-full"></div>
                                )}
                            </div>

                            <div className="flex-grow">
                                <div className="flex flex-col p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                                    {/* Name / Group */}
                                    <span className="font-semibold text-black dark:text-white truncate">
                                        {'groupName' in suggestedUser
                                            ? suggestedUser.groupName
                                            : suggestedUser.username}
                                    </span>

                                    {/* Last message + Time on same row */}
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[80%]">
                                            {suggestedUser.lastMessage?.text || 'No messages yet'}
                                        </span>

                                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                                            {suggestedUser.lastMessage?.createdAt
                                                ? new Date(suggestedUser.lastMessage.createdAt).toLocaleString(
                                                      'en-IN',
                                                      {
                                                          day: '2-digit',
                                                          month: 'short',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      }
                                                  )
                                                : ''}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-xs dark:text-white flex justify-between">
                                    {onlineUsers?.includes(suggestedUser?._id) && (
                                        <p className="text-xs text-gray-400">Active now</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            ) : (
                <p className="text-gray-500">No following users available.</p>
            )}
        </ScrollArea>
    );
}

export default MessagesMember;
